<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreItemRequest;
use App\Http\Requests\UpdateItemRequest;
use App\Models\Item;
use App\Models\ItemImage;
use App\Models\Location;
use App\Models\WorkArea;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ItemController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $filters = $request->only(['search', 'type', 'location_id', 'owner_work_area_id', 'item_category']);

        $itemsQuery = Item::query()
            ->with(['location', 'ownerWorkArea', 'images'])
            ->filter($filters)
            ->latest('id');

        // Jika user bukan tkno_admin, jangan tampilkan barang dengan area kepemilikan 'Shop'
        if (!$user || !$user->isTknoAdmin()) {
            $itemsQuery->whereDoesntHave('ownerWorkArea', function ($q) {
                $q->whereRaw('LOWER(TRIM(name)) = ?', ['shop']);
            });
        }

        $items = $itemsQuery->paginate(12)->withQueryString();

        // Append approval check helper for currently logged-in user
        $items->getCollection()->transform(function ($item) use ($user) {
            $item->requires_approval = $item->requiresApprovalFor($user);
            return $item;
        });
        $no_po = $request->input('no_po');

        $locations = Location::withCount('items')->orderBy('name')->get();

        $workAreasQuery = WorkArea::orderBy('name');
        if (!$user || !$user->isTknoAdmin()) {
            $workAreasQuery->whereRaw('LOWER(TRIM(name)) != ?', ['shop']);
        }
        $workAreas = $workAreasQuery->get(['id', 'name']);

        $types = [
            'Control Valve',
            'Pressure',
            'Flow',
            'Level',
            'Analyzer',
            'PLC/DCS',
            'Pagging',
            'Burner',
            'Dosometer',
            'Accessories / Sparepart',
            'Bagging & Bagcode',
            'Safety Device',
        ];

        $sapClassifications = [
            'PAGGING',
            'DOSOMETER',
            'Bagging',
            'PLC & DCS',
            'Analyzer',
            'CONTROL VALVE DAN SOV',
            'Other',
        ];

        $units = [
            'Pieces (PCS)',
            'Eaches (EA)',
            'Kilogram (KG)',
            'Liter (L)',
            'Set (SET)',
            'Roll (ROLL)',
            'Meter (M)',
            'Box (BOX)',
            'Unit (UNT)',
        ];

        return Inertia::render('Items/Index', [
            'items' => $items,
            'filters' => $filters,
            'locations' => $locations,
            'workAreas' => $workAreas,
            'types' => $types,
            'units' => $units,
            'no_po' => $no_po,
            'sapClassifications' => $sapClassifications,
        ]);
    }

    public function store(StoreItemRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $images = $request->file('images', []);
        unset($validated['images']);

        // Filter valid po_numbers
        if (isset($validated['po_numbers']) && is_array($validated['po_numbers'])) {
            $filteredPo = array_values(array_filter($validated['po_numbers'], function ($po) {
                return !empty(trim($po['number'] ?? '')) || !empty(trim($po['date'] ?? ''));
            }));
            $validated['po_numbers'] = !empty($filteredPo) ? $filteredPo : null;
            if (!empty($filteredPo) && empty($validated['no_po'])) {
                $validated['no_po'] = $filteredPo[0]['number'] ?? null;
            }
        }

        DB::transaction(function () use ($validated, $images) {
            $item = Item::create($validated);

            if (!empty($images)) {
                foreach ($images as $index => $file) {
                    $path = $file->store('items', 'public');
                    ItemImage::create([
                        'item_id' => $item->id,
                        'image_path' => $path,
                        'is_primary' => $index === 0,
                    ]);
                }
            }
        });

        return redirect()->back()->with('success', 'Barang / Sparepart berhasil ditambahkan.');
    }

    public function update(UpdateItemRequest $request, Item $item): RedirectResponse
    {
        $validated = $request->validated();
        $newImages = $request->file('images', []);
        unset($validated['images']);

        // Filter valid po_numbers
        if (isset($validated['po_numbers']) && is_array($validated['po_numbers'])) {
            $filteredPo = array_values(array_filter($validated['po_numbers'], function ($po) {
                return !empty(trim($po['number'] ?? '')) || !empty(trim($po['date'] ?? ''));
            }));
            $validated['po_numbers'] = !empty($filteredPo) ? $filteredPo : null;
            if (!empty($filteredPo) && empty($validated['no_po'])) {
                $validated['no_po'] = $filteredPo[0]['number'] ?? null;
            }
        }

        DB::transaction(function () use ($item, $validated, $newImages) {
            $item->update($validated);

            if (!empty($newImages)) {
                $hasPrimary = $item->images()->where('is_primary', true)->exists();
                foreach ($newImages as $index => $file) {
                    $path = $file->store('items', 'public');
                    ItemImage::create([
                        'item_id' => $item->id,
                        'image_path' => $path,
                        'is_primary' => !$hasPrimary && $index === 0,
                    ]);
                }
            }
        });

        return redirect()->back()->with('success', 'Data barang berhasil diperbarui.');
    }

    public function destroy(Request $request, Item $item): RedirectResponse
    {
        if (!$request->user()->canManageItems()) {
            abort(403, 'Unauthorized action.');
        }

        DB::transaction(function () use ($item) {
            foreach ($item->images as $img) {
                if (!str_starts_with($img->image_path, 'http')) {
                    Storage::disk('public')->delete($img->image_path);
                }
            }
            $item->delete();
        });

        return redirect()->back()->with('success', 'Barang berhasil dihapus.');
    }

    public function updateStockOpname(Request $request, Item $item): RedirectResponse
    {
        if (!$request->user()->canManageItems()) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'actual_stock' => ['required', 'integer', 'min:0'],
            'last_stock_opname_at' => ['required', 'date'],
        ]);

        $item->update($validated);

        return redirect()->back()->with('success', 'Stok Opname berhasil diperbarui.');
    }

    public function exportSap(Request $request): StreamedResponse
    {
        $selectedIds = $request->input('ids');
        if (is_string($selectedIds)) {
            $selectedIds = array_filter(explode(',', $selectedIds));
        }

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="SAP_Items_Export_' . date('Ymd_His') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($selectedIds) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM so Excel opens it with proper encoding
            fputs($handle, "\xEF\xBB\xBF");

            // Header matching workorder requirements:
            // MN | PO Code | Deskripsi | Deskripsi SAP | Klasifikasi | Status | Reorder point | Min lot size | Notes
            fputcsv($handle, [
                'MN',
                'Nomor PO',
                'Deskripsi',
                'Deskripsi SAP',
                'Klasifikasi',
                'Status',
                'Reorder point',
                'Min lot size',
                'Unit Satuan',
                'System Stock',
                'Actual Stock',
                'Lokasi',
                'Owner Area',
                'Notes',
            ]);

            $query = Item::with(['location', 'ownerWorkArea']);

            $currentUser = auth()->user();
            if (!$currentUser || !$currentUser->isTknoAdmin()) {
                $query->whereDoesntHave('ownerWorkArea', function ($q) {
                    $q->whereRaw('LOWER(TRIM(name)) = ?', ['shop']);
                });
            }

            if (!empty($selectedIds)) {
                $query->whereIn('id', $selectedIds);
            }

            $query->chunk(200, function ($items) use ($handle) {
                foreach ($items as $item) {
                    $poText = '';
                    if (!empty($item->po_numbers) && is_array($item->po_numbers)) {
                        $poList = [];
                        foreach ($item->po_numbers as $po) {
                            $num = trim($po['number'] ?? '');
                            $dt = trim($po['date'] ?? '');
                            if ($num || $dt) {
                                $poList[] = $dt ? "{$num} ({$dt})" : $num;
                            }
                        }
                        $poText = implode(', ', $poList);
                    }
                    if (!$poText) {
                        $poText = $item->no_po ?? '';
                    }

                    fputcsv($handle, [
                        $item->mn_code ?? 'NO MN',
                        $poText,
                        $item->item_name,
                        $item->sap_description ?? '',
                        $item->sap_classification ?? '',
                        $item->sap_status ?? '',
                        $item->reorder_point,
                        $item->min_lot_size,
                        $item->unit ?? 'PCS',
                        $item->system_stock,
                        $item->actual_stock,
                        $item->location?->name ?? '',
                        $item->ownerWorkArea?->name ?? '',
                        $item->notes ?? '',
                    ]);
                }
            });

            fclose($handle);
        }, 200, $headers);
    }
}

