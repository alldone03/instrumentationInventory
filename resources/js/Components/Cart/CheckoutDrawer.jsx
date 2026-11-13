import { useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function CheckoutDrawer({
    isOpen,
    onClose,
    cartItems,
    user,
    onUpdateQuantity,
    onRemoveFromCart,
    onClearCart,
}) {
    if (!isOpen) return null;

    const fileInputRef = useRef(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    // Otomatis deteksi jenis transaksi: jika ada item tools -> otomatis Peminjaman Tools (akan ada pengembalian)
    const hasTools = cartItems.some((item) => item.item_category === 'tool');
    const autoTransactionType = hasTools ? 'tool_borrow' : 'material_take';

    const { data, setData, post, processing, errors, reset } = useForm({
        transaction_type: autoTransactionType,
        purpose_notes: '',
        checkout_photo: null,
        items: cartItems.map((item) => ({ id: item.id, quantity: item.quantity })),
    });

    // Update otomatis jenis transaksi saat keranjang bertambah/berkurang
    useEffect(() => {
        setData('transaction_type', autoTransactionType);
    }, [hasTools]);

    // Check if any item triggers cross-area approval
    const requiresApproval = cartItems.some((item) => item.requires_approval);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('checkout_photo', file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleRemovePhoto = () => {
        setData('checkout_photo', null);
        setPhotoPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const payloadItems = cartItems.map((item) => ({
            id: item.id,
            quantity: item.quantity,
        }));

        data.items = payloadItems;
        data.transaction_type = autoTransactionType;

        post(route('transactions.store'), {
            forceFormData: true,
            onSuccess: () => {
                reset();
                setPhotoPreview(null);
                onClearCart();
                onClose();
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/50 transition-opacity backdrop-blur-xs" onClick={onClose} />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
                    {/* Header */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🛒</span>
                            <h2 className="font-extrabold text-base text-slate-800">
                                Keranjang Checkout ({cartItems.length} Item)
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="btn btn-sm btn-circle btn-ghost text-slate-400 hover:bg-slate-200"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {cartItems.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
                                <span className="text-4xl mb-2">📦</span>
                                <p className="font-semibold text-sm text-slate-600">Keranjang Anda masih kosong</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Pilih barang dari katalog untuk melakukan checkout.
                                </p>
                            </div>
                        ) : (
                            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4">
                                {/* Otomatis Status Transaksi Card (menggantikan radio pilihan) */}
                                <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 shadow-xs ${
                                    hasTools
                                        ? 'bg-purple-50/70 border-purple-200 text-purple-900'
                                        : 'bg-blue-50/70 border-blue-200 text-blue-900'
                                }`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${
                                        hasTools ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                                    }`}>
                                        {hasTools ? '🔧' : '📦'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-xs">
                                                {hasTools ? 'Peminjaman Tools / Alat Kerja' : 'Pengambilan Material / Sparepart'}
                                            </span>
                                            <span className={`badge badge-xs font-semibold ${
                                                hasTools ? 'badge-secondary text-white' : 'badge-primary text-white'
                                            }`}>
                                                Otomatis
                                            </span>
                                        </div>
                                        <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
                                            {hasTools
                                                ? 'Keranjang terdeteksi memuat alat kerja (Tools). Sistem secara otomatis menetapkan status peminjaman dan wajib dikembalikan beserta foto bukti.'
                                                : 'Seluruh item merupakan sparepart consumable (habis pakai). Pengambilan langsung memotong stok.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Cross-Area Approval Alert Banner */}
                                {requiresApproval ? (
                                    <div className="alert alert-warning text-xs p-3 shadow-xs border border-amber-300 bg-amber-50 text-amber-950 rounded-xl">
                                        <div className="flex items-start gap-2">
                                            <span className="text-base shrink-0">⚠️</span>
                                            <div>
                                                <span className="font-bold block">Memerlukan Persetujuan (Approval)</span>
                                                <p className="mt-0.5 leading-relaxed text-[11px] text-amber-900">
                                                    Item berasal dari area kerja lain. Pengajuan akan diteruskan ke Supervisor (TKO) pemilik area sebelum stok diproses.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="alert text-xs p-3 border border-emerald-200 bg-emerald-50 text-emerald-950 rounded-xl shadow-xs">
                                        <div className="flex items-start gap-2">
                                            <span className="text-base shrink-0">✅</span>
                                            <div>
                                                <span className="font-bold block">Auto-Approved (Langsung Selesai)</span>
                                                <p className="mt-0.5 leading-relaxed text-[11px] text-emerald-800">
                                                    Item merupakan barang Umum/Shared atau milik area Anda. Transaksi langsung diproses tanpa menunggu approval.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Items list */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                                        <span>Daftar Barang & Satuan</span>
                                        <button
                                            type="button"
                                            onClick={onClearCart}
                                            className="text-red-500 hover:underline text-[11px]"
                                        >
                                            Kosongkan
                                        </button>
                                    </div>

                                    {cartItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="badge badge-primary badge-xs font-mono font-bold">
                                                        {item.mn_code || 'NO MN'}
                                                    </span>
                                                    <span className={`badge badge-xs font-medium ${
                                                        item.item_category === 'tool' ? 'badge-secondary text-white' : 'badge-ghost'
                                                    }`}>
                                                        {item.item_category === 'tool' ? '🔧 Tool' : '📦 Part'}
                                                    </span>
                                                    <span className="badge badge-outline badge-xs font-semibold text-slate-600">
                                                        {item.unit || 'PCS'}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-slate-800 truncate">
                                                    {item.item_name}
                                                </h4>
                                                <span className="text-[11px] text-slate-500">
                                                    Tersedia: {item.system_stock} {item.unit || 'PCS'}
                                                </span>
                                            </div>

                                            {/* Qty Controls */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                                    className="btn btn-xs btn-circle btn-outline border-slate-300 hover:bg-slate-200"
                                                >
                                                    -
                                                </button>
                                                <div className="flex flex-col items-center justify-center">
                                                    <span className="font-mono font-bold text-xs text-slate-800">
                                                        {item.quantity}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-semibold leading-none">
                                                        {item.unit || 'PCS'}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                                    disabled={item.quantity >= item.system_stock}
                                                    className="btn btn-xs btn-circle btn-outline border-slate-300 hover:bg-slate-200"
                                                >
                                                    +
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onRemoveFromCart(item.id)}
                                                    className="btn btn-xs btn-ghost text-red-500 ml-1"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Purpose Notes */}
                                <div>
                                    <label className="label py-1">
                                        <span className="label-text font-bold text-xs text-slate-700">
                                            Keperluan / Tag No / Work Order <span className="text-red-500">*</span>
                                        </span>
                                    </label>
                                    <textarea
                                        required
                                        rows="2"
                                        value={data.purpose_notes}
                                        onChange={(e) => setData('purpose_notes', e.target.value)}
                                        placeholder="Contoh: Perbaikan & kalibrasi Transmitter PT-104 area NPK 1 (WO #4421)"
                                        className="textarea textarea-bordered text-xs w-full bg-white border-slate-300 focus:border-blue-600"
                                    />
                                    {errors.purpose_notes && (
                                        <span className="text-red-500 text-xs mt-1 block">{errors.purpose_notes}</span>
                                    )}
                                </div>

                                {/* Mandatory Photo Upload & Mobile Camera */}
                                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                    <label className="label-text font-bold text-xs text-slate-700 flex items-center justify-between mb-1">
                                        <span>Foto Bukti Fisik Barang <span className="text-red-500">*</span></span>
                                        <span className="text-[10px] text-slate-400 font-normal">Wajib Diambil/Diunggah</span>
                                    </label>
                                    <p className="text-[11px] text-slate-500 mb-2">
                                        Foto barang/alat fisik saat diambil dari rak/gudang untuk audit.
                                    </p>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        required
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handlePhotoChange}
                                        className="file-input file-input-bordered file-input-sm w-full bg-white border-slate-300"
                                    />
                                    {errors.checkout_photo && (
                                        <span className="text-red-500 text-xs mt-1 block">{errors.checkout_photo}</span>
                                    )}

                                    {photoPreview && (
                                        <div className="mt-3 relative rounded-lg overflow-hidden border border-slate-300 h-36 bg-slate-900">
                                            <img
                                                src={photoPreview}
                                                alt="Bukti Checkout"
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
                            </form>
                        )}
                    </div>

                    {/* Footer / Submit */}
                    {cartItems.length > 0 && (
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn btn-sm btn-ghost text-slate-600"
                            >
                                Tutup
                            </button>
                            <button
                                type="submit"
                                form="checkout-form"
                                disabled={processing || cartItems.length === 0}
                                className={`btn btn-sm text-white font-semibold flex-1 shadow-sm ${
                                    hasTools ? 'btn-secondary' : 'btn-primary'
                                }`}
                            >
                                {processing ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                ) : hasTools ? (
                                    'Kirim Peminjaman Alat (Wajib Kembali) 🔧'
                                ) : (
                                    'Kirim Pengambilan Material 📦'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
