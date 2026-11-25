import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function ReturnModal({ transaction, isOpen, onClose }) {
    const fileInputRef = useRef(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [clientError, setClientError] = useState('');

    // Normalisasi daftar item dari transaksi
    const normalizedItems = useMemo(() => {
        if (!transaction?.items) return [];
        return transaction.items.map((tItem) => {
            // Gunakan sisa qty jika backend mengirim remaining_qty / returned_quantity, fallback ke quantity
            const activeBorrowed =
                tItem.remaining_qty ??
                Math.max(0, Number(tItem.quantity || 0) - Number(tItem.returned_quantity || 0));

            return {
                transaction_item_id: tItem.id,
                item_id: tItem.item_id ?? tItem.item?.id,
                item_name: tItem.item?.item_name || 'Item',
                unit: tItem.item?.unit || 'unit',
                borrowed_qty: activeBorrowed,
                return_qty: activeBorrowed, // Default: kembalikan semua yang masih dipinjam
            };
        });
    }, [transaction]);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        return_photo: null,
        items: [],
    });

    // Sinkronkan state form setiap kali modal dibuka atau transaksi berganti
    useEffect(() => {
        if (isOpen && transaction) {
            clearErrors();
            setClientError('');
            setData({
                return_photo: null,
                items: normalizedItems.map((item) => ({
                    transaction_item_id: item.transaction_item_id,
                    item_id: item.item_id,
                    item_name: item.item_name,
                    unit: item.unit,
                    borrowed_qty: item.borrowed_qty,
                    return_qty: item.return_qty,
                })),
            });
            setPhotoPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [isOpen, transaction, normalizedItems]);

    // Bersihkan object URL agar tidak bocor memori
    useEffect(() => {
        return () => {
            if (photoPreview) URL.revokeObjectURL(photoPreview);
        };
    }, [photoPreview]);

    if (!isOpen || !transaction) return null;

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
            data.items.map((item) => ({ ...item, return_qty: item.borrowed_qty }))
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
            if (photoPreview) URL.revokeObjectURL(photoPreview);
            setData('return_photo', file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleRemovePhoto = () => {
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setData('return_photo', null);
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Pisahkan ringkasan yang dikembalikan vs tetap dipinjam
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

        if (totalReturningQty <= 0) {
            setClientError('Pilih minimal 1 alat dengan jumlah kembali lebih dari 0.');
            return;
        }

        // Kirim hanya item yang dikembalikan (atau seluruh items jika backend membutuhkannya)
        post(route('transactions.return_data', transaction.id), {
            forceFormData: true,
            onSuccess: (data) => {
                // console.log(data);
                reset();
                handleRemovePhoto();
                onClose();
            },
        });
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-2xl bg-base-100 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
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
                        Pengembalian Alat Kerja
                    </span>
                    <h3 className="font-bold text-lg text-base-content mt-1">
                        Kembalikan Tool: {transaction.transaction_code}
                    </h3>
                    <p className="text-xs text-base-content/60">
                        Peminjam: {transaction.user?.name} (
                        {transaction.requester_work_area?.name || 'Area Umum'})
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Input Jumlah Kembali per Item */}
                    <div className="bg-base-200/40 p-3.5 rounded-lg border border-base-300">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                            <span className="font-bold text-xs text-base-content">
                                Atur Jumlah yang Dikembalikan:
                            </span>
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
                        </div>

                        <div className="divide-y divide-base-300/70">
                            {data.items.map((item, idx) => {
                                const stillBorrowed = Math.max(
                                    0,
                                    Number(item.borrowed_qty) - Number(item.return_qty)
                                );

                                return (
                                    <div
                                        key={item.transaction_item_id ?? idx}
                                        className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                    >
                                        <div>
                                            <div className="text-xs font-semibold text-base-content">
                                                {item.item_name}
                                            </div>
                                            <div className="text-[11px] text-base-content/60">
                                                Sedang dipinjam:{' '}
                                                <span className="font-mono font-semibold text-base-content">
                                                    {item.borrowed_qty} {item.unit}
                                                </span>{' '}
                                                · Sisa setelah ini:{' '}
                                                <span
                                                    className={`font-mono font-semibold ${stillBorrowed > 0
                                                        ? 'text-warning'
                                                        : 'text-success'
                                                        }`}
                                                >
                                                    {stillBorrowed} {item.unit}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-end sm:self-center">
                                            <span className="text-[11px] text-base-content/70">
                                                Kembali:
                                            </span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={item.borrowed_qty}
                                                value={item.return_qty}
                                                onChange={(e) => handleQtyChange(idx, e.target.value)}
                                                className="input input-bordered input-xs w-20 text-center font-mono font-bold"
                                            />
                                            <span className="text-[11px] text-base-content/60 w-10">
                                                {item.unit}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {clientError && (
                            <p className="text-error text-xs font-medium mt-2">{clientError}</p>
                        )}
                        {errors.items && (
                            <p className="text-error text-xs font-medium mt-2">{errors.items}</p>
                        )}
                    </div>

                    {/* Ringkasan 2 Kolom: Akan Dikembalikan vs Tetap Dipinjam */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Kolom 1: Akan Dikembalikan */}
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
                                    {returningList.map((item) => (
                                        <li
                                            key={item.transaction_item_id}
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

                        {/* Kolom 2: Tetap Dipinjam */}
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
                                    {remainingList.map((item) => (
                                        <li
                                            key={item.transaction_item_id}
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

                    {/* Foto Bukti */}
                    <div>
                        <label className="label py-1">
                            <span className="label-text font-bold text-xs text-base-content flex items-center justify-between w-full">
                                <span>
                                    Foto Bukti Pengembalian Fisik{' '}
                                    <span className="text-error">*</span>
                                </span>
                                <span className="text-[10px] text-base-content/60 font-normal">
                                    Wajib Diambil/Diunggah
                                </span>
                            </span>
                        </label>
                        <p className="text-[11px] text-base-content/60 mb-2">
                            Ambil foto kondisi fisik alat saat diletakkan kembali ke rak/lokasi
                            gudang.
                        </p>

                        <input
                            ref={fileInputRef}
                            type="file"
                            required
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoChange}
                            className="file-input file-input-bordered file-input-sm w-full"
                        />
                        {errors.return_photo && (
                            <span className="text-error text-xs mt-1 block">
                                {errors.return_photo}
                            </span>
                        )}

                        {photoPreview && (
                            <div className="mt-3 relative rounded-lg overflow-hidden border border-base-300 h-40 bg-black">
                                <img
                                    src={photoPreview}
                                    alt="Bukti Kembali"
                                    className="w-full h-full object-contain"
                                />
                                <button
                                    type="button"
                                    onClick={handleRemovePhoto}
                                    className="btn btn-xs btn-circle btn-error text-white absolute top-2 right-2 shadow"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="modal-action pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-sm btn-ghost"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={processing || totalReturningQty <= 0}
                            className="btn btn-sm btn-secondary font-semibold text-white px-6"
                        >
                            {processing ? 'Memproses...' : 'Konfirmasi Pengembalian'}
                        </button>
                    </div>
                </form>
            </div>
            <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
        </div>
    );
}