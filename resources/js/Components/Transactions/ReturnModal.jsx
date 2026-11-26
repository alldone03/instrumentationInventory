import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import CreatableSelect from '../CreatableSelect';

const toDateTimeLocalValue = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function ReturnModal({
    transaction,
    isOpen,
    onClose,
    availableItems = [],
    requesterNames = [],
}) {
    const fileInputRef = useRef(null);
    const dropdownRef = useRef(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [clientError, setClientError] = useState('');

    // State searchable dropdown & item baru yang dipilih sebelum klik "Tambah Barang"
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedCatalogItemId, setSelectedCatalogItemId] = useState('');
    const [newItemQty, setNewItemQty] = useState(1);

    const stockActive = transaction
        ? !['pending_approval', 'rejected'].includes(transaction.status)
        : true;

    const getCatalogStock = (itemId, fallbackStock = 0) => {
        const found = availableItems.find((i) => String(i.id) === String(itemId));
        return Number(found?.system_stock ?? fallbackStock ?? 0);
    };

    // Normalisasi daftar item dari transaksi
    const normalizedItems = useMemo(() => {
        if (!transaction?.items) return [];
        return transaction.items.map((tItem) => {
            const activeBorrowed =
                tItem.remaining_qty ??
                Math.max(0, Number(tItem.quantity || 0) - Number(tItem.returned_quantity || 0));
            const itemId = tItem.item_id ?? tItem.item?.id;
            const currentStock = getCatalogStock(itemId, tItem.item?.system_stock ?? 0);

            return {
                transaction_item_id: tItem.id,
                item_id: itemId,
                item_name: tItem.item?.item_name || 'Item',
                unit: tItem.item?.unit || 'unit',
                original_qty: activeBorrowed,
                system_stock: currentStock,
                borrowed_qty: activeBorrowed,
                return_qty: activeBorrowed,
                is_added: false,
            };
        });
    }, [transaction, availableItems]);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        return_photo: null,
        items: [],
        waktu: '',
        pemohon: '',
        catatan: '',
    });

    // Sinkronkan state form setiap kali modal dibuka atau transaksi berganti
    useEffect(() => {
        if (isOpen && transaction) {
            clearErrors();
            setClientError('');
            setSearchQuery('');
            setIsDropdownOpen(false);
            setSelectedCatalogItemId('');
            setNewItemQty(1);

            setData({
                return_photo: null,
                items: normalizedItems,
                waktu: toDateTimeLocalValue(transaction.created_at || transaction.returned_at),
                pemohon: transaction.requester_name || transaction.user?.name || '',
                catatan: transaction.purpose_notes || transaction.notes || '',
            });

            setPhotoPreview(
                transaction.return_photo_url || transaction.checkout_photo_url || null
            );
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [isOpen, transaction, normalizedItems]);

    // Tutup dropdown pencarian saat klik di luar area dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Bersihkan object URL hanya jika berasal dari File yang baru dipilih
    useEffect(() => {
        return () => {
            if (photoPreview && photoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);

    // Filter hasil pencarian barang dari katalog
    const filteredCatalogItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return availableItems;
        return availableItems.filter((item) => {
            const name = (item.item_name || item.name || '').toLowerCase();
            const code = (item.mn_code || item.item_code || item.code || '').toLowerCase();
            return name.includes(q) || code.includes(q);
        });
    }, [availableItems, searchQuery]);

    const selectedCatalogItem = useMemo(
        () => availableItems.find((i) => String(i.id) === String(selectedCatalogItemId)) || null,
        [availableItems, selectedCatalogItemId]
    );

    if (!isOpen || !transaction) return null;

    const getMaxAllowedBorrowed = (item) => {
        const currentStock = getCatalogStock(item.item_id, item.system_stock);
        return stockActive ? Number(item.original_qty || 0) + currentStock : currentStock;
    };

    const handleSelectCatalogItem = (item) => {
        const stock = Number(item.system_stock ?? 0);
        if (stock <= 0) {
            setClientError(`Stok "${item.item_name || item.name}" sedang kosong (0), tidak dapat ditambahkan.`);
            return;
        }
        setClientError('');
        setSelectedCatalogItemId(String(item.id));
        setSearchQuery(item.item_name || item.name || '');
        setIsDropdownOpen(false);
    };

    // Tambah barang dari hasil pencarian ke daftar items
    const handleAddItem = (catalogItem = null) => {
        setClientError('');
        const target = catalogItem || selectedCatalogItem;

        if (!target) {
            setClientError('Pilih barang dari dropdown pencarian terlebih dahulu sebelum menambahkan.');
            return;
        }

        const availableStock = Number(target.system_stock ?? 0);
        if (availableStock <= 0) {
            setClientError(`Stok "${target.item_name || target.name}" sedang kosong (0), tidak dapat ditambahkan.`);
            return;
        }

        const qtyToAdd = Math.max(1, parseInt(newItemQty, 10) || 1);
        const existingIndex = data.items.findIndex(
            (row) => String(row.item_id) === String(target.id)
        );

        if (existingIndex !== -1) {
            const existingRow = data.items[existingIndex];
            const maxAllowed = getMaxAllowedBorrowed(existingRow);
            const nextBorrowed = Number(existingRow.borrowed_qty) + qtyToAdd;

            if (nextBorrowed > maxAllowed) {
                setClientError(
                    `Jumlah pinjam "${existingRow.item_name}" melebihi stok tersedia (Maks: ${maxAllowed} ${existingRow.unit}, Stok gudang: ${availableStock}).`
                );
                return;
            }

            const updated = data.items.map((row, idx) =>
                idx === existingIndex
                    ? {
                        ...row,
                        system_stock: availableStock,
                        borrowed_qty: nextBorrowed,
                    }
                    : row
            );
            setData('items', updated);
        } else {
            if (qtyToAdd > availableStock) {
                setClientError(
                    `Jumlah "${target.item_name || target.name}" (${qtyToAdd}) melebihi stok tersedia (${availableStock} ${target.unit || 'unit'}).`
                );
                return;
            }

            const itemName = target.item_name || target.name || 'Item';
            const itemUnit = target.unit || 'unit';
            setData('items', [
                ...data.items,
                {
                    transaction_item_id: null,
                    item_id: target.id,
                    item_name: itemName,
                    unit: itemUnit,
                    original_qty: 0,
                    system_stock: availableStock,
                    borrowed_qty: qtyToAdd,
                    return_qty: 0,
                    is_added: true,
                },
            ]);
        }

        setSelectedCatalogItemId('');
        setSearchQuery('');
        setNewItemQty(1);
        setIsDropdownOpen(false);
    };

    const handleRemoveItem = (index) => {
        if (data.items.length <= 1) {
            setClientError('Minimal harus ada 1 barang dalam transaksi.');
            return;
        }
        setClientError('');
        setData(
            'items',
            data.items.filter((_, idx) => idx !== index)
        );
    };

    const handleBorrowedQtyChange = (index, rawValue) => {
        setClientError('');
        const targetItem = data.items[index];
        if (!targetItem) return;

        const maxAllowed = getMaxAllowedBorrowed(targetItem);
        let parsed = parseInt(rawValue, 10);
        if (isNaN(parsed) || parsed < 0) parsed = 0;

        if (maxAllowed > 0 && parsed > maxAllowed) {
            setClientError(
                `Jumlah dibawa "${targetItem.item_name}" tidak boleh melebihi stok yang tersedia (Maks: ${maxAllowed} ${targetItem.unit}, Stok gudang: ${getCatalogStock(targetItem.item_id, targetItem.system_stock)}).`
            );
            parsed = maxAllowed;
        } else if (maxAllowed <= 0 && parsed > Number(targetItem.original_qty || 0)) {
            setClientError(
                `Stok gudang untuk "${targetItem.item_name}" sedang 0, tidak dapat menambah jumlah dibawa.`
            );
            parsed = Math.max(0, Number(targetItem.original_qty || 0));
        }

        const updated = data.items.map((item, idx) => {
            if (idx !== index) return item;
            const originalQty = Number(item.original_qty ?? 0);
            const autoReturn = Math.max(0, originalQty - parsed);
            return {
                ...item,
                borrowed_qty: parsed,
                return_qty: autoReturn,
            };
        });
        setData('items', updated);
    };

    const handleQtyChange = (index, rawValue) => {
        setClientError('');
        const maxQty = data.items[index]?.borrowed_qty ?? 0;
        let parsed = parseInt(rawValue, 10);

        if (isNaN(parsed) || parsed < 0) parsed = 0;
        if (parsed > maxQty) parsed = maxQty;

        const updated = data.items.map((item, idx) =>
            idx === index ? { ...item, return_qty: parsed } : item
        );
        setData('items', updated);
    };

    const handleReturnAll = () => {
        setClientError('');
        setData(
            'items',
            data.items.map((item) => ({
                ...item,
                borrowed_qty: 0,
                return_qty: Number(item.original_qty ?? item.borrowed_qty ?? 0),
            }))
        );
    };

    const handleClearAll = () => {
        setClientError('');
        setData(
            'items',
            data.items.map((item) => ({ ...item, return_qty: 0 }))
        );
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (photoPreview && photoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(photoPreview);
            }
            setData('return_photo', file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleRemovePhoto = () => {
        if (photoPreview && photoPreview.startsWith('blob:')) {
            URL.revokeObjectURL(photoPreview);
        }
        setData('return_photo', null);
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const returningList = data.items.filter((item) => Number(item.return_qty) > 0);
    const remainingList = data.items
        .map((item) => ({
            ...item,
            still_borrowed_qty: Math.max(0, Number(item.borrowed_qty) - Number(item.return_qty)),
        }))
        .filter((item) => item.still_borrowed_qty > 0);

    const totalReturningQty = returningList.reduce((acc, item) => acc + Number(item.return_qty), 0);
    const totalRemainingQty = remainingList.reduce(
        (acc, item) => acc + Number(item.still_borrowed_qty),
        0
    );

    const handleSubmit = (e) => {
        e.preventDefault();

        if (data.items.length === 0) {
            setClientError('Minimal harus ada 1 barang dalam transaksi.');
            return;
        }

        for (const item of data.items) {
            const maxAllowed = getMaxAllowedBorrowed(item);
            if (Number(item.borrowed_qty) > maxAllowed && maxAllowed >= 0) {
                setClientError(
                    `Jumlah pinjam "${item.item_name}" (${item.borrowed_qty}) melebihi stok tersedia (${maxAllowed}).`
                );
                return;
            }
        }

        post(route('transactions.return_data', transaction.id), {
            forceFormData: true,
            onSuccess: () => {
                reset();
                handleRemovePhoto();
                onClose();
            },
        });
    };

    const selectedStock = selectedCatalogItem ? Number(selectedCatalogItem.system_stock ?? 0) : 0;

    return (
        <div className="modal modal-open">
            <div className="modal-box w-11/12 max-w-full bg-base-100 p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
                <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-base-content/70 hover:bg-base-200"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="mb-4">
                    <span className="badge badge-secondary badge-sm font-semibold">
                        Pengembalian & Update Alat Kerja
                    </span>
                    <h3 className="font-bold text-lg text-base-content mt-1">
                        Update / Kembalikan Tool: {transaction.transaction_code}
                    </h3>
                    <p className="text-xs text-base-content/60">
                        Peminjam: {data.pemohon || transaction.user?.name} (
                        {transaction.requester_work_area?.name || 'Area Umum'})
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Searchable Dropdown & Tambah Barang */}
                    <div className="bg-base-200/40 p-3.5 rounded-lg border border-base-300 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-base-content">
                                Cari & Tambah Barang:
                            </span>
                            <span className="text-[11px] text-base-content/60">
                                {filteredCatalogItems.length} barang tersedia
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                            {/* Searchable Dropdown */}
                            <div ref={dropdownRef} className="relative sm:col-span-8">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setSelectedCatalogItemId('');
                                            setIsDropdownOpen(true);
                                        }}
                                        placeholder="Ketik nama atau kode MN untuk mencari barang..."
                                        className="input input-bordered input-xs w-full pr-14"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchQuery('');
                                                setSelectedCatalogItemId('');
                                                setIsDropdownOpen(true);
                                            }}
                                            className="btn btn-ghost btn-xs absolute right-6 top-0 h-full px-1.5 text-base-content/50"
                                            title="Bersihkan"
                                        >
                                            ✕
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsDropdownOpen((prev) => !prev)}
                                        className="btn btn-ghost btn-xs absolute right-0 top-0 h-full px-2 text-base-content/60"
                                        aria-label="Toggle dropdown barang"
                                    >
                                        ▾
                                    </button>
                                </div>

                                {isDropdownOpen && (
                                    <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-base-300 bg-base-100 shadow-xl z-50 divide-y divide-base-200">
                                        {filteredCatalogItems.length === 0 ? (
                                            <div className="px-3 py-2.5 text-xs text-base-content/50 italic text-center">
                                                Barang tidak ditemukan
                                            </div>
                                        ) : (
                                            filteredCatalogItems.slice(0, 50).map((item) => {
                                                const stock = Number(item.system_stock ?? 0);
                                                const isOutOfStock = stock <= 0;
                                                const isSelected =
                                                    String(item.id) === String(selectedCatalogItemId);

                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        disabled={isOutOfStock}
                                                        onClick={() => handleSelectCatalogItem(item)}
                                                        className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-xs transition ${isOutOfStock
                                                            ? 'opacity-50 cursor-not-allowed bg-base-200/40'
                                                            : 'hover:bg-base-200/70'
                                                            } ${isSelected ? 'bg-primary/10 font-semibold' : ''}`}
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate text-base-content font-medium">
                                                                {item.item_name || item.name}
                                                            </div>
                                                            {item.mn_code && (
                                                                <div className="text-[10px] font-mono text-base-content/50">
                                                                    MN: {item.mn_code}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span
                                                            className={`badge badge-xs font-mono shrink-0 ${stock > 0
                                                                ? 'badge-success text-white'
                                                                : 'badge-error text-white'
                                                                }`}
                                                        >
                                                            {isOutOfStock
                                                                ? 'Stok: 0 (Habis)'
                                                                : `Stok: ${stock} ${item.unit || 'unit'}`}
                                                        </span>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>

                            <input
                                type="number"
                                min={1}
                                max={selectedStock > 0 ? selectedStock : undefined}
                                value={newItemQty}
                                onChange={(e) => setNewItemQty(e.target.value)}
                                className="input input-bordered input-xs sm:col-span-2 w-full text-center font-mono"
                                aria-label="Jumlah barang baru"
                            />

                            <button
                                type="button"
                                disabled={!selectedCatalogItem || selectedStock <= 0}
                                onClick={() => handleAddItem()}
                                className="btn btn-xs btn-primary sm:col-span-2 w-full text-white"
                            >
                                + Tambah Barang
                            </button>
                        </div>

                        {selectedCatalogItem && (
                            <div className="text-[11px] text-base-content/70 flex items-center gap-2">
                                <span>Terpilih:</span>
                                <span className="font-semibold text-base-content">
                                    {selectedCatalogItem.item_name}
                                </span>
                                <span
                                    className={`badge badge-xs font-mono ${selectedStock > 0 ? 'badge-outline' : 'badge-error text-white'
                                        }`}
                                >
                                    Stok: {selectedStock} {selectedCatalogItem.unit || 'unit'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Form Informasi Transaksi */}
                    <div className="bg-base-200/30 p-4 rounded-xl border border-base-300 space-y-3">
                        <div className="text-xs font-bold text-base-content">
                            Informasi Transaksi
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text text-xs font-semibold">No. Transaksi</span>
                                </label>
                                <input
                                    type="text"
                                    value={transaction.transaction_code}
                                    readOnly
                                    className="input input-bordered input-sm font-mono font-bold text-primary bg-base-200/60"
                                />
                            </div>

                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text text-xs font-semibold">Waktu</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    value={data.waktu}
                                    onChange={(e) => setData('waktu', e.target.value)}
                                    className="input input-bordered input-sm w-full"
                                />
                            </div>

                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text text-xs font-semibold">Pemohon</span>
                                </label>
                                <CreatableSelect
                                    options={requesterNames.map((n) => ({
                                        value: n.requester_name,
                                        label: n.requester_name,
                                    }))}
                                    value={
                                        data.pemohon
                                            ? { value: data.pemohon, label: data.pemohon }
                                            : null
                                    }
                                    onChange={(opt) => setData('pemohon', opt ? opt.value : '')}
                                    onCreateOption={(newVal) => setData('pemohon', newVal)}
                                    placeholder="Pilih atau ketik nama pemohon..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text text-xs font-semibold">Catatan / Keperluan</span>
                                </label>
                                <textarea
                                    rows={2}
                                    value={data.catatan}
                                    onChange={(e) => setData('catatan', e.target.value)}
                                    placeholder="Catatan..."
                                    className="textarea textarea-bordered textarea-sm w-full"
                                />
                            </div>

                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text text-xs font-semibold">Bukti Foto</span>
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handlePhotoChange}
                                        className="file-input file-input-bordered file-input-sm flex-1"
                                    />
                                    {photoPreview && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <img
                                                src={photoPreview}
                                                alt="Bukti Kembali"
                                                className="w-10 h-10 object-cover rounded-lg border border-base-300"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleRemovePhoto}
                                                className="btn btn-xs btn-ghost text-error"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Daftar Barang (Form Cards) */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-base-content">
                                Daftar Barang ({data.items.length})
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {data.items.map((item, idx) => {
                                const stillBorrowed = Math.max(
                                    0,
                                    Number(item.borrowed_qty) - Number(item.return_qty)
                                );
                                const isFull =
                                    Number(item.borrowed_qty) > 0 &&
                                    Number(item.return_qty) === Number(item.borrowed_qty);
                                const currentStock = getCatalogStock(
                                    item.item_id,
                                    item.system_stock
                                );
                                const maxAllowed = getMaxAllowedBorrowed(item);

                                return (
                                    <div
                                        key={item.transaction_item_id ?? `${item.item_id}-${idx}`}
                                        className="p-3.5 rounded-xl border border-base-300 bg-base-100 shadow-xs space-y-2.5"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="font-bold text-xs text-base-content truncate">
                                                    {item.item_name}
                                                </div>
                                                <span className="badge badge-xs badge-ghost font-mono mt-1">
                                                    Stok gudang: {currentStock} {item.unit}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    disabled={Number(item.borrowed_qty) <= 0}
                                                    onClick={() =>
                                                        handleBorrowedQtyChange(idx, 0)
                                                    }
                                                    className="btn btn-xs btn-outline btn-secondary"
                                                    title="Kembalikan semua (dibawa = 0)"
                                                >
                                                    Kembali
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={data.items.length <= 1}
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="btn btn-xs btn-ghost text-error"
                                                    title="Hapus barang dari daftar"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>

                                        <div className="pt-1 space-y-1.5">
                                            <div className="form-control">
                                                <label className="label py-0.5">
                                                    <span className="label-text text-[11px] font-medium">
                                                        Dibawa Pemohon ({item.unit})
                                                    </span>
                                                    <span className="label-text-alt text-[10px] text-base-content/50">
                                                        Awal: {Number(item.original_qty ?? 0)} | Maks: {maxAllowed}
                                                    </span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={maxAllowed > 0 ? maxAllowed : undefined}
                                                    value={item.borrowed_qty}
                                                    onChange={(e) =>
                                                        handleBorrowedQtyChange(idx, e.target.value)
                                                    }
                                                    className="input input-bordered input-xs w-full text-center font-mono font-bold"
                                                />
                                            </div>
                                            {Number(item.borrowed_qty) < Number(item.original_qty ?? 0) && (
                                                <div className="text-[11px] text-success font-medium">
                                                    ↩ Kembali ke gudang: {Number(item.original_qty ?? 0) - Number(item.borrowed_qty)} {item.unit}
                                                </div>
                                            )}
                                            {Number(item.borrowed_qty) > Number(item.original_qty ?? 0) && (
                                                <div className="text-[11px] text-warning font-medium">
                                                    ➕ Tambah bawa (kurangi stok): +{Number(item.borrowed_qty) - Number(item.original_qty ?? 0)} {item.unit}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex gap-1.5">
                            <button
                                type="button"
                                onClick={handleReturnAll}
                                className="btn btn-xs btn-outline btn-secondary"
                            >
                                Kembalikan Semua
                            </button>
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="btn btn-xs btn-ghost border border-base-300"
                            >
                                Reset (0)
                            </button>
                        </div>
                        {clientError && (
                            <p className="text-error text-xs font-medium">{clientError}</p>
                        )}
                        {errors.items && (
                            <p className="text-error text-xs font-medium">{errors.items}</p>
                        )}
                        {errors.return_photo && (
                            <p className="text-error text-xs font-medium">{errors.return_photo}</p>
                        )}
                    </div>

                    {/* Ringkasan 2 Kolom: Akan Dikembalikan vs Tetap Dipinjam */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg border border-success/40 bg-success/5">
                            <div className="flex items-center justify-between font-bold text-success mb-2">
                                <span>Akan Dikembalikan</span>
                                <span className="badge badge-success badge-sm text-white font-mono">
                                    {totalReturningQty}
                                </span>
                            </div>
                            {returningList.length === 0 ? (
                                <p className="text-[11px] text-base-content/50 italic">
                                    Belum ada item yang dipilih untuk dikembalikan.
                                </p>
                            ) : (
                                <ul className="space-y-1">
                                    {returningList.map((item, i) => (
                                        <li
                                            key={item.transaction_item_id ?? `ret-${item.item_id}-${i}`}
                                            className="flex justify-between items-center text-[11px]"
                                        >
                                            <span className="truncate pr-2 text-base-content">
                                                {item.item_name}
                                            </span>
                                            <span className="font-mono font-bold text-success shrink-0">
                                                +{item.return_qty} {item.unit}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="p-3 rounded-lg border border-warning/40 bg-warning/5">
                            <div className="flex items-center justify-between font-bold text-warning-content mb-2">
                                <span className="text-warning">Tetap Dipinjam</span>
                                <span className="badge badge-warning badge-sm font-mono">
                                    {totalRemainingQty}
                                </span>
                            </div>
                            {remainingList.length === 0 ? (
                                <p className="text-[11px] text-base-content/50 italic">
                                    Tidak ada sisa item yang tetap dipinjam (lunas dikembalikan).
                                </p>
                            ) : (
                                <ul className="space-y-1">
                                    {remainingList.map((item, i) => (
                                        <li
                                            key={item.transaction_item_id ?? `rem-${item.item_id}-${i}`}
                                            className="flex justify-between items-center text-[11px]"
                                        >
                                            <span className="truncate pr-2 text-base-content">
                                                {item.item_name}
                                            </span>
                                            <span className="font-mono font-bold text-warning shrink-0">
                                                {item.still_borrowed_qty} {item.unit}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="modal-action pt-2">
                        <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={processing || data.items.length === 0}
                            className="btn btn-sm btn-secondary font-semibold text-white px-6"
                        >
                            {processing ? 'Memproses...' : 'Simpan & Konfirmasi'}
                        </button>
                    </div>
                </form>
            </div>
            <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
        </div>
    );
}
