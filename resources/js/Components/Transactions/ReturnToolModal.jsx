import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function ReturnToolModal({ transaction, isOpen, onClose }) {
    if (!isOpen || !transaction) return null;

    const fileInputRef = useRef(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        return_photo: null,
    });

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('return_photo', file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('transactions.return', transaction.id), {
            forceFormData: true,
            onSuccess: () => {
                reset();
                setPhotoPreview(null);
                onClose();
            },
        });
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-md bg-base-100 p-6 shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-base-content/70 hover:bg-base-200"
                >
                    ✕
                </button>

                <div className="mb-4">
                    <span className="badge badge-secondary badge-sm font-semibold">Pengembalian Alat Kerja</span>
                    <h3 className="font-bold text-lg text-base-content mt-1">
                        Kembalikan Tool: {transaction.transaction_code}
                    </h3>
                    <p className="text-xs text-base-content/60">
                        Peminjam: {transaction.user?.name} ({transaction.requester_work_area?.name || 'Area Umum'})
                    </p>
                </div>

                {/* List of items being returned */}
                <div className="bg-base-200/50 p-3 rounded-lg border border-base-300 mb-4 text-xs space-y-1.5">
                    <span className="font-bold text-base-content/80 block">Alat yang Dikembalikan:</span>
                    {transaction.items?.map((tItem) => (
                        <div key={tItem.id} className="flex justify-between items-center text-xs">
                            <span className="font-medium text-base-content">{tItem.item?.item_name}</span>
                            <span className="font-mono font-bold badge badge-sm">{tItem.quantity} {tItem.item?.unit || 'unit'}</span>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label py-1">
                            <span className="label-text font-bold text-xs text-base-content flex items-center justify-between">
                                <span>Foto Bukti Pengembalian Fisik <span className="text-error">*</span></span>
                                <span className="text-[10px] text-base-content/60 font-normal">Wajib Diambil/Diunggah</span>
                            </span>
                        </label>
                        <p className="text-[11px] text-base-content/60 mb-2">
                            Ambil foto kondisi fisik alat saat diletakkan kembali ke rak/lokasi gudang.
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
                            <span className="text-error text-xs mt-1 block">{errors.return_photo}</span>
                        )}

                        {photoPreview && (
                            <div className="mt-3 relative rounded-lg overflow-hidden border border-base-300 h-40 bg-black">
                                <img src={photoPreview} alt="Bukti Kembali" className="w-full h-full object-contain" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setData('return_photo', null);
                                        setPhotoPreview(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="btn btn-xs btn-circle btn-error text-white absolute top-2 right-2 shadow"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="modal-action pt-2">
                        <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
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

