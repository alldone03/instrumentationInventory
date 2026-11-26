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
    public function index(Request $request): Response|\Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        $search = trim((string) $request->input('search', ''));
        $sortBy = (string) ($request->input('sort_by') ?: 'created_at');
        $sortDir = strtolower((string) ($request->input('sort_dir') ?: 'desc')) === 'asc' ? 'asc' : 'desc';
        $statusFilter = trim((string) $request->input('status', ''));

        $allowedSorts = ['created_at', 'transaction_code', 'requester_name', 'status', 'id'];
        $sortColumn = in_array($sortBy, $allowedSorts, true) ? $sortBy : 'created_at';

        $applySearch = function ($q) use ($search) {
            $q->where(function ($sub) use ($search) {
                $sub->where('transaction_code', 'like', "%{$search}%")
                    ->orWhere('requester_name', 'like', "%{$search}%")
                    ->orWhere('purpose_notes', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('items.item', fn ($iq) => $iq->where('item_name', 'like', "%{$search}%"));
            });
        };

        // 1. Pending Approvals Query
        $pendingQuery = InventoryTransaction::with(['user', 'requesterWorkArea', 'items.item.ownerWorkArea', 'items.item.location'])
            ->where('status', 'pending_approval');

        if ($user->isTko()) {
            $pendingQuery->whereHas('items.item', function ($q) use ($user) {
                $q->where('owner_work_area_id', $user->work_area_id);
            });
        } elseif ($user->isTkno()) {
            $pendingQuery->where('user_id', $user->id);
        }

        if ($search !== '') {
            $applySearch($pendingQuery);
        }
        $pendingQuery->orderBy($sortColumn, $sortDir)->orderByDesc('id');

        // 2. Unified Transaction & Active Borrowed Tools Log Query
        $historyQuery = InventoryTransaction::with(['user', 'requesterWorkArea', 'items.item.ownerWorkArea', 'items.item.location', 'approver'])
            ->whereIn('status', ['borrowed', 'partially_returned', 'approved', 'rejected', 'returned', 'completed']);

        if ($user->isTkno()) {
            $historyQuery->where('user_id', $user->id);
        } elseif ($user->isTko()) {
            $historyQuery->where(function ($q) use ($user) {
                $q->where('requester_work_area_id', $user->work_area_id)
                    ->orWhereHas('items.item', function ($iq) use ($user) {
                        $iq->where('owner_work_area_id', $user->work_area_id);
                    });
            });
        }

        if ($statusFilter !== '') {
            $historyQuery->where('status', $statusFilter);
        }
        if ($search !== '') {
            $applySearch($historyQuery);
        }
        $historyQuery->orderBy($sortColumn, $sortDir)->orderByDesc('id');

        $historyTransactions = $historyQuery->paginate(15)->withQueryString();

        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            return response()->json($historyTransactions);
        }

        // Hitung jumlah alat yang masih aktif dipinjam (untuk badge info)
        $borrowedCountQuery = InventoryTransaction::whereIn('status', ['borrowed', 'partially_returned']);
        if ($user->isTkno()) {
            $borrowedCountQuery->where('user_id', $user->id);
        } elseif ($user->isTko()) {
            $borrowedCountQuery->where(function ($q) use ($user) {
                $q->where('requester_work_area_id', $user->work_area_id)
                    ->orWhereHas('items.item', function ($iq) use ($user) {
                        $iq->where('owner_work_area_id', $user->work_area_id);
                    });
            });
        }

        $availableItemsQuery = Item::query()->orderBy('item_name');
        if (!$user || !$user->isTknoAdmin()) {
            $availableItemsQuery->whereDoesntHave('ownerWorkArea', function ($q) {
                $q->whereRaw('LOWER(TRIM(name)) = ?', ['shop']);
            });
        }
        $availableItems = $availableItemsQuery->get([
            'id',
            'item_name',
            'mn_code',
            'unit',
            'system_stock',
            'item_category',
        ]);

        return Inertia::render('Transactions/Index', [
            'pendingTransactions' => $pendingQuery->get(),
            'historyTransactions' => $historyTransactions,
            'borrowedCount' => $borrowedCountQuery->count(),
            'availableItems' => $availableItems,
            'requesterNames' => InventoryTransaction::select('requester_name')
                ->whereNotNull('requester_name')
                ->where('requester_name', '!=', '')
                ->distinct()
                ->orderBy('requester_name')
                ->get(),
            'filters' => [
                'search' => $search,
                'sort_by' => $sortColumn,
                'sort_dir' => $sortDir,
                'status' => $statusFilter,
            ],
        ]);
    }

    public function store(CheckoutRequest $request): RedirectResponse
    {
        $user = $request->user();
        // dd($request);
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
                    'requester_name' => $validated['requester_name'],
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
                    'requester_name' => $validated['requester_name'],
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
        // resnponse json
        // App\Http\Controllers\InventoryTransactionController::store(): Return value must be of type Illuminate\Http\RedirectResponse, Illuminate\Http\Response returned

        return redirect()->back()->with('success', implode(' | ', $messages));
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

    public function returnToolData(Request $request, InventoryTransaction $transaction): RedirectResponse
    {
        $validated = $request->validate([
            'return_photo' => ['nullable', 'file', 'image', 'max:5120'],
            'waktu' => ['nullable', 'date'],
            'pemohon' => ['nullable', 'string', 'max:255'],
            'catatan' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.transaction_item_id' => ['nullable', 'integer'],
            'items.*.item_id' => ['required', 'integer', 'exists:items,id'],
            'items.*.borrowed_qty' => ['required', 'integer', 'min:1'],
            'items.*.return_qty' => ['required', 'integer', 'min:0'],
        ], [
            'items.required' => 'Data item pengembalian wajib diisi.',
        ]);

        $photoPath = null;
        if ($request->hasFile('return_photo')) {
            $photoPath = $request->file('return_photo')->store('transactions', 'public');
        }

        DB::transaction(function () use ($validated, $transaction, $photoPath) {
            $stockActive = !in_array($transaction->status, ['pending_approval', 'rejected'], true);
            $existingItems = $transaction->items()->lockForUpdate()->get()->keyBy('id');

            $keptIds = collect($validated['items'])
                ->pluck('transaction_item_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->all();

            // Hapus item yang dihapus oleh user dari daftar transaksi & kembalikan stoknya
            foreach ($existingItems as $existingId => $existingItem) {
                if (!in_array((int) $existingId, $keptIds, true)) {
                    if ($stockActive && (int) $existingItem->quantity > 0) {
                        $masterItem = Item::lockForUpdate()->find($existingItem->item_id);
                        if ($masterItem) {
                            $masterItem->increment('system_stock', (int) $existingItem->quantity);
                        }
                    }
                    $existingItem->delete();
                }
            }

            foreach ($validated['items'] as $row) {
                $borrowedQty = (int) $row['borrowed_qty'];
                $returnQty = min((int) $row['return_qty'], $borrowedQty);
                $remainingQty = max(0, $borrowedQty - $returnQty);
                $txItemId = !empty($row['transaction_item_id']) ? (int) $row['transaction_item_id'] : null;

                if ($txItemId && $existingItems->has($txItemId)) {
                    $txItem = $existingItems->get($txItemId);
                    $oldQty = (int) $txItem->quantity;
                    $diff = $remainingQty - $oldQty;

                    if ($stockActive && $diff !== 0) {
                        $masterItem = Item::lockForUpdate()->find($txItem->item_id);
                        if ($masterItem) {
                            if ($diff > 0) {
                                if ($masterItem->system_stock < $diff) {
                                    throw ValidationException::withMessages([
                                        'items' => ["Stok tidak mencukupi untuk '{$masterItem->item_name}'. Tersedia: {$masterItem->system_stock}, Dibutuhkan tambahan: {$diff}."],
                                    ]);
                                }
                                $masterItem->decrement('system_stock', $diff);
                            } else {
                                $masterItem->increment('system_stock', abs($diff));
                            }
                        }
                    }

                    $txItem->update([
                        'quantity' => $remainingQty,
                    ]);
                } else {
                    if ($stockActive && $remainingQty > 0) {
                        $masterItem = Item::lockForUpdate()->findOrFail($row['item_id']);
                        if ($masterItem->system_stock < $remainingQty) {
                            throw ValidationException::withMessages([
                                'items' => ["Stok tidak mencukupi untuk '{$masterItem->item_name}'. Tersedia: {$masterItem->system_stock}, Diminta: {$remainingQty}."],
                            ]);
                        }
                        $masterItem->decrement('system_stock', $remainingQty);
                    }

                    InventoryTransactionItem::create([
                        'inventory_transaction_id' => $transaction->id,
                        'item_id' => $row['item_id'],
                        'quantity' => $remainingQty,
                    ]);
                }
            }

            $updateData = [];
            if (array_key_exists('pemohon', $validated) && $validated['pemohon'] !== null) {
                $updateData['requester_name'] = $validated['pemohon'];
            }
            if (array_key_exists('catatan', $validated) && $validated['catatan'] !== null) {
                $updateData['purpose_notes'] = $validated['catatan'];
            }
            if ($photoPath) {
                $updateData['return_photo_path'] = $photoPath;
            }
            if (!empty($validated['waktu'])) {
                $updateData['created_at'] = \Carbon\Carbon::parse($validated['waktu']);
            }

            if ($stockActive && $transaction->transaction_type === 'tool_borrow') {
                $totalRemaining = (int) $transaction->items()->sum('quantity');
                if ($totalRemaining === 0) {
                    $updateData['status'] = 'returned';
                    $updateData['returned_at'] = $transaction->returned_at ?? now();
                } elseif ($transaction->status === 'returned') {
                    $updateData['status'] = 'borrowed';
                }
            }

            if (!empty($updateData)) {
                $transaction->update($updateData);
            }
        });

        return redirect()
            ->back()
            ->with('success', "Alat untuk transaksi {$transaction->transaction_code} berhasil diperbarui dan stok telah disesuaikan.");
    }

    public function destroy(Request $request, InventoryTransaction $transaction): RedirectResponse
    {
        if (!$request->user()?->isTknoAdmin()) {
            abort(403, 'Hanya TKNO Admin yang dapat menghapus log transaksi.');
        }

        DB::transaction(function () use ($transaction) {
            $stockActive = !in_array($transaction->status, ['pending_approval', 'rejected'], true);
            if ($stockActive) {
                foreach ($transaction->items as $tItem) {
                    if ((int) $tItem->quantity > 0 && $tItem->item) {
                        $tItem->item->increment('system_stock', (int) $tItem->quantity);
                    }
                }
            }

            if ($transaction->checkout_photo_path && !str_starts_with($transaction->checkout_photo_path, 'http')) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($transaction->checkout_photo_path);
            }
            if ($transaction->return_photo_path && !str_starts_with($transaction->return_photo_path, 'http')) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($transaction->return_photo_path);
            }

            $transaction->delete();
        });

        return redirect()
            ->back()
            ->with('success', "Transaksi {$transaction->transaction_code} berhasil dihapus.");
    }
}
