import { useForm } from '@inertiajs/react';

export default function RejectModal({ transaction, isOpen, onClose }) {
    if (!isOpen || !transaction) return null;

    const { data, setData, post, processing, errors, reset } = useForm({
        rejection_reason: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('transactions.reject', transaction.id), {
            onSuccess: () => {
                reset();
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
                    <span className="badge badge-error badge-sm text-white font-semibold">Tolak Pengajuan</span>
                    <h3 className="font-bold text-lg text-base-content mt-1">
                        Tolak Transaksi {transaction.transaction_code}
                    </h3>
                    <p className="text-xs text-base-content/60">
                        Pemohon: {transaction.user?.name} ({transaction.requester_work_area?.name || 'Area Umum'})
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label py-1">
                            <span className="label-text font-bold text-xs text-base-content">
                                Alasan Penolakan <span className="text-error">*</span>
                            </span>
                        </label>
                        <textarea
                            required
                            rows="3"
                            value={data.rejection_reason}
                            onChange={(e) => setData('rejection_reason', e.target.value)}
                            placeholder="Jelaskan alasan penolakan permintaan ini..."
                            className="textarea textarea-bordered text-xs w-full"
                        />
                        {errors.rejection_reason && (
                            <span className="text-error text-xs mt-1 block">{errors.rejection_reason}</span>
                        )}
                    </div>

                    <div className="modal-action pt-2">
                        <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="btn btn-sm btn-error font-semibold text-white px-5"
                        >
                            {processing ? 'Menolak...' : 'Konfirmasi Tolak'}
                        </button>
                    </div>
                </form>
            </div>
            <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
        </div>
    );
}

