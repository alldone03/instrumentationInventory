<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckoutRequest;
use App\Models\InventoryTransaction;
use App\Models\InventoryTransactionItem;
use App\Models\Item;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class InventoryTransactionController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // 1. Pending Approvals Query
        $pendingQuery = InventoryTransaction::with(['user', 'requesterWorkArea', 'items.item.ownerWorkArea', 'items.item.location'])
            ->where('status', 'pending_approval')
            ->latest('id');

        if ($user->isTko()) {
            // TKO sees transactions that contain items owned by their work area
            $pendingQuery->whereHas('items.item', function ($q) use ($user) {
                $q->where('owner_work_area_id', $user->work_area_id);
            });
        } elseif ($user->isTkno()) {
            // Field tech sees their own pending requests
            $pendingQuery->where('user_id', $user->id);
        }
        // Admin sees all

        // 2. Active Borrowed Tools Query
        $borrowedQuery = InventoryTransaction::with(['user', 'requesterWorkArea', 'items.item.ownerWorkArea', 'items.item.location', 'approver'])
            ->where('status', 'borrowed')
            ->latest('id');

        if ($user->isTkno()) {
            $borrowedQuery->where('user_id', $user->id);
        } elseif ($user->isTko()) {
            $borrowedQuery->where(function ($q) use ($user) {
                $q->where('requester_work_area_id', $user->work_area_id)
                    ->orWhereHas('items.item', function ($iq) use ($user) {
                        $iq->where('owner_work_area_id', $user->work_area_id);
                    });
            });
        }

        // 3. Transaction History Log Query
        $historyQuery = InventoryTransaction::with(['user', 'requesterWorkArea', 'items.item.ownerWorkArea', 'items.item.location', 'approver'])
            ->whereIn('status', ['approved', 'rejected', 'returned', 'completed'])
            ->latest('id');

        if ($user->isTkno()) {
            $historyQuery->where('user_id', $user->id);
        }

        return Inertia::render('Transactions/Index', [
            'pendingTransactions' => $pendingQuery->get(),
            'borrowedTransactions' => $borrowedQuery->get(),
            'historyTransactions' => $historyQuery->paginate(15)->withQueryString(),
        ]);
    }

    public function store(CheckoutRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $itemsInput = collect($validated['items']);
        $itemIds = $itemsInput->pluck('id')->all();

        $items = Item::with('ownerWorkArea')->whereIn('id', $itemIds)->get()->keyBy('id');

        // Check stock availability
        foreach ($itemsInput as $input) {
            $item = $items->get($input['id']);
            if (!$item) {
                throw ValidationException::withMessages([
                    'items' => ["Barang dengan ID {$input['id']} tidak ditemukan."],
                ]);
            }
            if ($item->system_stock < $input['quantity']) {
                throw ValidationException::withMessages([
                    'items' => ["Stok tidak mencukupi untuk item '{$item->item_name}'. Tersedia: {$item->system_stock}, Diminta: {$input['quantity']}."],
                ]);
            }
        }

        // Handle Checkout Photo Upload
        $photoFile = $request->file('checkout_photo');
        $photoPath = $photoFile->store('transactions', 'public');

        // Pisahkan item berdasarkan kategori: tools (pinjam) vs consumable (ambil material)
        $toolItems = $itemsInput->filter(function ($input) use ($items) {
            $item = $items->get($input['id']);
            return $item && $item->item_category === 'tool';
        });

        $materialItems = $itemsInput->filter(function ($input) use ($items) {
            $item = $items->get($input['id']);
            return !$item || $item->item_category !== 'tool';
        });

        $createdTransactions = [];

        DB::transaction(function () use ($user, $validated, $photoPath, $toolItems, $materialItems, $items, &$createdTransactions) {
            $datePrefix = date('Ymd');

            // 1. Proses Peminjaman Tools jika ada
            if ($toolItems->isNotEmpty()) {
                $requiresApproval = false;
                foreach ($toolItems as $input) {
                    $item = $items->get($input['id']);
                    if ($item->requiresApprovalFor($user)) {
                        $requiresApproval = true;
                        break;
                    }
                }

                $status = $requiresApproval ? 'pending_approval' : 'borrowed';
                $countToday = InventoryTransaction::whereDate('created_at', today())->count() + 1;
                $toolCode = sprintf('TRX-%s-%04d', $datePrefix, $countToday);

                $toolTransaction = InventoryTransaction::create([
                    'transaction_code' => $toolCode,
                    'user_id' => $user->id,
                    'requester_work_area_id' => $user->work_area_id,
                    'transaction_type' => 'tool_borrow',
                    'status' => $status,
                    'approved_by' => $requiresApproval ? null : $user->id,
                    'approved_at' => $requiresApproval ? null : now(),
                    'checkout_photo_path' => $photoPath,
                    'purpose_notes' => $validated['purpose_notes'],
                ]);

                foreach ($toolItems as $input) {
                    $item = $items->get($input['id']);
                    InventoryTransactionItem::create([
                        'inventory_transaction_id' => $toolTransaction->id,
                        'item_id' => $item->id,
                        'quantity' => $input['quantity'],
                    ]);

                    if (!$requiresApproval) {
                        $item->decrement('system_stock', $input['quantity']);
                    }
                }

                $createdTransactions[] = [
                    'type' => 'tool_borrow',
                    'code' => $toolCode,
                    'requires_approval' => $requiresApproval,
                ];
            }

            // 2. Proses Pengambilan Material jika ada
            if ($materialItems->isNotEmpty()) {
                $requiresApproval = false;
                foreach ($materialItems as $input) {
                    $item = $items->get($input['id']);
                    if ($item->requiresApprovalFor($user)) {
                        $requiresApproval = true;
                        break;
                    }
                }

                $status = $requiresApproval ? 'pending_approval' : 'completed';
                $countToday = InventoryTransaction::whereDate('created_at', today())->count() + 1;
                $materialCode = sprintf('TRX-%s-%04d', $datePrefix, $countToday);

                $materialTransaction = InventoryTransaction::create([
                    'transaction_code' => $materialCode,
                    'user_id' => $user->id,
                    'requester_work_area_id' => $user->work_area_id,
                    'transaction_type' => 'material_take',
                    'status' => $status,
                    'approved_by' => $requiresApproval ? null : $user->id,
                    'approved_at' => $requiresApproval ? null : now(),
                    'checkout_photo_path' => $photoPath,
                    'purpose_notes' => $validated['purpose_notes'],
                ]);

                foreach ($materialItems as $input) {
                    $item = $items->get($input['id']);
                    InventoryTransactionItem::create([
                        'inventory_transaction_id' => $materialTransaction->id,
                        'item_id' => $item->id,
                        'quantity' => $input['quantity'],
                    ]);

                    if (!$requiresApproval) {
                        $item->decrement('system_stock', $input['quantity']);
                    }
                }

                $createdTransactions[] = [
                    'type' => 'material_take',
                    'code' => $materialCode,
                    'requires_approval' => $requiresApproval,
                ];
            }
        });

        // Susun pesan notifikasi yang jelas
        $messages = [];
        foreach ($createdTransactions as $trxInfo) {
            if ($trxInfo['type'] === 'tool_borrow') {
                $messages[] = $trxInfo['requires_approval']
                    ? "Peminjaman alat ({$trxInfo['code']}) menunggu approval TKO pemilik area."
                    : "Peminjaman alat ({$trxInfo['code']}) aktif dan masuk daftar alat sedang dipinjam.";
            } else {
                $messages[] = $trxInfo['requires_approval']
                    ? "Pengambilan material ({$trxInfo['code']}) menunggu approval TKO pemilik area."
                    : "Pengambilan material ({$trxInfo['code']}) berhasil diselesaikan & stok dipotong.";
            }
        }

        return redirect()->route('transactions.index')->with('success', implode(' | ', $messages));
    }

    public function approve(Request $request, InventoryTransaction $transaction): RedirectResponse
    {
        $user = $request->user();

        if (!$user->canManageItems()) {
            abort(403, 'Anda tidak memiliki hak akses untuk menyetujui transaksi ini.');
        }

        if ($transaction->status !== 'pending_approval') {
            return redirect()->back()->with('error', 'Transaksi ini tidak dalam status menunggu persetujuan.');
        }

        // If TKO, ensure they own at least one item in the transaction or match the work area
        if ($user->isTko()) {
            $ownsItem = $transaction->items()->whereHas('item', function ($q) use ($user) {
                $q->where('owner_work_area_id', $user->work_area_id);
            })->exists();

            if (!$ownsItem) {
                abort(403, 'Anda hanya dapat menyetujui barang milik area kerja Anda.');
            }
        }

        // Validate stock before deducting
        foreach ($transaction->items as $tItem) {
            if ($tItem->item->system_stock < $tItem->quantity) {
                return redirect()->back()->with('error', "Stok sistem untuk item '{$tItem->item->item_name}' tidak mencukupi untuk disetujui (Tersisa: {$tItem->item->system_stock}).");
            }
        }

        DB::transaction(function () use ($transaction, $user) {
            $newStatus = $transaction->transaction_type === 'material_take' ? 'completed' : 'borrowed';

            $transaction->update([
                'status' => $newStatus,
                'approved_by' => $user->id,
                'approved_at' => now(),
            ]);

            foreach ($transaction->items as $tItem) {
                $tItem->item->decrement('system_stock', $tItem->quantity);
            }
        });

        return redirect()->back()->with('success', "Transaksi {$transaction->transaction_code} berhasil disetujui.");
    }

    public function reject(Request $request, InventoryTransaction $transaction): RedirectResponse
    {
        $user = $request->user();

        if (!$user->canManageItems()) {
            abort(403, 'Anda tidak memiliki hak akses untuk menolak transaksi ini.');
        }

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'min:3'],
        ]);

        $transaction->update([
            'status' => 'rejected',
            'approved_by' => $user->id,
            'approved_at' => now(),
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        return redirect()->back()->with('success', "Transaksi {$transaction->transaction_code} telah ditolak.");
    }

    public function returnTool(Request $request, InventoryTransaction $transaction): RedirectResponse
    {
        if ($transaction->status !== 'borrowed') {
            return redirect()->back()->with('error', 'Hanya alat yang sedang dipinjam yang dapat dikembalikan.');
        }

        $request->validate([
            'return_photo' => ['required', 'file', 'image', 'max:5120'],
        ], [
            'return_photo.required' => 'Foto bukti pengembalian alat wajib diunggah!',
        ]);

        $photoFile = $request->file('return_photo');
        $photoPath = $photoFile->store('transactions', 'public');

        DB::transaction(function () use ($transaction, $photoPath) {
            $transaction->update([
                'status' => 'returned',
                'return_photo_path' => $photoPath,
                'returned_at' => now(),
            ]);

            // Increment back stock
            foreach ($transaction->items as $tItem) {
                $tItem->item->increment('system_stock', $tItem->quantity);
            }
        });

        return redirect()->back()->with('success', "Alat untuk transaksi {$transaction->transaction_code} berhasil dikembalikan dan stok telah dikembalikan ke sistem.");
    }
}
