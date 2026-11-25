import { useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import CreatableSelect from '../CreatableSelect';

export default function CheckoutDrawer({
    isOpen,
    onClose,
    cartItems,
    user,
    onUpdateQuantity,
    onRemoveFromCart,
    onClearCart,
    requesterNames
}) {
    if (!isOpen) return null;

    const fileInputRef = useRef(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    // Filter item berdasarkan kategori
    const toolItems = cartItems.filter((item) => item.item_category === 'tool');
    const materialItems = cartItems.filter((item) => item.item_category !== 'tool');

    const hasTools = toolItems.length > 0;
    const hasMaterials = materialItems.length > 0;

    const { data, setData, post, processing, errors, reset } = useForm({
        purpose_notes: '',
        requester_name: '',
        checkout_photo: null,
        items: cartItems.map((item) => ({ id: item.id, quantity: item.quantity })),
    });



    const namaUserOptions = requesterNames.map((name) => ({ value: name.requester_name, label: name.requester_name }));
    // nama 
    // console.log(namaUserOptions)
    const [NamaUser, setNamaUser] = useState([...namaUserOptions
    ]);

    const [selectedNamaUser, setSelectedNamaUser] = useState(null);

    useEffect(() => {
        if (selectedNamaUser) {
            setData('requester_name', selectedNamaUser.value);
        }
    }, [selectedNamaUser]);

    // Fungsi untuk menambahkan opsi baru ke state utama (atau kirim ke API/Backend)
    const handleCreateNamaUser = (newOption) => {
        setNamaUser((prev) => [...prev, newOption]);

    };

    // Cek apakah ada item yang membutuhkan approval
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
        console.log(data);
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
                                {/* Ringkasan Pemisahan Log Transaksi Otomatis */}
                                {hasTools && hasMaterials ? (
                                    <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 text-xs text-blue-950 shadow-xs space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base shrink-0">⚡</span>
                                            <span className="font-bold">Log Transaksi Terpisah Otomatis</span>
                                        </div>
                                        <p className="text-[11px] leading-relaxed text-blue-900">
                                            Keranjang ini memuat item alat kerja dan material sparepart. Sistem akan secara otomatis memecah menjadi <b>2 log transaksi terpisah</b>:
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <div className="p-2 rounded-lg bg-purple-100/70 border border-purple-200 text-purple-900">
                                                <span className="font-bold block text-[11px]">🔧 {toolItems.length} Alat (Pinjam)</span>
                                                <span className="text-[10px] text-purple-700">Masuk daftar pinjam & ada pengembalian</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-blue-100/70 border border-blue-200 text-blue-900">
                                                <span className="font-bold block text-[11px]">📦 {materialItems.length} Material</span>
                                                <span className="text-[10px] text-blue-700">Masuk riwayat pengambilan langsung</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : hasTools ? (
                                    <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/70 text-xs text-purple-950 shadow-xs flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center text-base shrink-0">
                                            🔧
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs">Peminjaman Tools / Alat Kerja</span>
                                                <span className="badge badge-secondary badge-xs text-white">Otomatis</span>
                                            </div>
                                            <p className="text-[11px] mt-0.5 text-purple-900 leading-relaxed">
                                                Barang yang dipinjam akan masuk ke <b>daftar alat sedang dipinjam</b> dan wajib dikembalikan nanti beserta foto bukti.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 text-xs text-blue-950 shadow-xs flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-base shrink-0">
                                            📦
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs">Pengambilan Material / Sparepart</span>
                                                <span className="badge badge-primary badge-xs text-white">Otomatis</span>
                                            </div>
                                            <p className="text-[11px] mt-0.5 text-blue-900 leading-relaxed">
                                                Barang consumable habis pakai, stok langsung dipotong dan masuk ke <b>riwayat log pengambilan</b>.
                                            </p>
                                        </div>
                                    </div>
                                )}

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

                                {/* Daftar Barang Berdasarkan Kelompok Log */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                                        <span>Daftar Barang Checkout</span>
                                        <button
                                            type="button"
                                            onClick={onClearCart}
                                            className="text-red-500 hover:underline text-[11px]"
                                        >
                                            Kosongkan Keranjang
                                        </button>
                                    </div>

                                    {/* Sub-Group 1: Alat yang Dipinjam (Wajib Kembali) */}
                                    {toolItems.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-bold text-purple-900 bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-200">
                                                <span>🔧 Peminjaman Alat ({toolItems.length} Item)</span>
                                                <span className="text-[10px] text-purple-700 font-normal ml-auto">
                                                    (Ada Pengembalian)
                                                </span>
                                            </div>

                                            {toolItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="p-3 bg-purple-50/30 rounded-xl border border-purple-200/80 flex items-center justify-between gap-3 text-xs"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                            <span className="badge badge-primary badge-xs font-mono font-bold">
                                                                {item.mn_code || 'NO MN'}
                                                            </span>
                                                            <span className="badge badge-secondary badge-xs text-white">
                                                                Tool
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
                                    )}

                                    {/* Sub-Group 2: Material / Sparepart (Pengambilan) */}
                                    {materialItems.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200">
                                                <span>📦 Pengambilan Material ({materialItems.length} Item)</span>
                                                <span className="text-[10px] text-blue-700 font-normal ml-auto">
                                                    (Habis Pakai)
                                                </span>
                                            </div>

                                            {materialItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="p-3 bg-blue-50/30 rounded-xl border border-blue-200/80 flex items-center justify-between gap-3 text-xs"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                            <span className="badge badge-primary badge-xs font-mono font-bold">
                                                                {item.mn_code || 'NO MN'}
                                                            </span>
                                                            <span className="badge badge-ghost badge-xs">
                                                                Part
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
                                    )}
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
                                <div>
                                    <label className="label py-1">
                                        <span className="label-text font-bold text-xs text-slate-700">
                                            Nama <span className="text-red-500">*</span>
                                        </span>
                                    </label>
                                    <div className='w-full'>

                                        <CreatableSelect
                                            options={NamaUser}
                                            value={selectedNamaUser}
                                            onChange={setSelectedNamaUser}
                                            onCreateOption={handleCreateNamaUser}
                                            placeholder="Cari atau ketik kategori baru..."
                                        />
                                    </div>
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
                                className={`btn btn-sm text-white font-semibold flex-1 shadow-sm ${hasTools && hasMaterials
                                    ? 'btn-primary bg-gradient-to-r from-purple-600 to-blue-600 border-0'
                                    : hasTools
                                        ? 'btn-secondary'
                                        : 'btn-primary'
                                    }`}
                            >
                                {processing ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                ) : hasTools && hasMaterials ? (
                                    'Proses Checkout (Pisah 2 Log Otomatis) 🚀'
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
