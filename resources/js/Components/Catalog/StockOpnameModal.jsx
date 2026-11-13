import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

export default function StockOpnameModal({ item, isOpen, onClose }) {
    if (!isOpen || !item) return null;

    const { data, setData, post, processing, errors, reset } = useForm({
        actual_stock: item.actual_stock ?? item.system_stock ?? 0,
        last_stock_opname_at: new Date().toISOString().slice(0, 16),
    });

    useEffect(() => {
        if (item) {
            setData({
                actual_stock: item.actual_stock ?? item.system_stock ?? 0,
                last_stock_opname_at: new Date().toISOString().slice(0, 16),
            });
        }
    }, [item]);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('items.stock-opname', item.id), {
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
                    <span className="badge badge-warning badge-sm font-semibold">Stock Opname</span>
                    <h3 className="font-bold text-lg text-base-content mt-1">{item.item_name}</h3>
                    <p className="text-xs text-base-content/60 font-mono">
                        {item.mn_code ? `MN: ${item.mn_code}` : 'NO MN'} • Lokasi: {item.location?.name || '-'}
                    </p>
                </div>

                <div className="bg-base-200/50 p-3 rounded-lg border border-base-300 mb-4 text-xs space-y-1">
                    <div className="flex justify-between">
                        <span className="text-base-content/70">Stok Sistem Saat Ini:</span>
                        <span className="font-bold text-base-content">{item.system_stock} {item.unit || 'PCS'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-base-content/70">Stok Fisik Sebelumnya:</span>
                        <span className="font-medium text-base-content">{item.actual_stock} {item.unit || 'PCS'}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label py-1">
                            <span className="label-text font-semibold text-xs text-base-content">
                                Jumlah Stok Fisik Hasil Opname <span className="text-error">*</span>
                            </span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            required
                            value={data.actual_stock}
                            onChange={(e) => setData('actual_stock', e.target.value)}
                            className="input input-bordered input-sm w-full"
                            placeholder="Masukkan jumlah fisik aktual..."
                        />
                        {errors.actual_stock && (
                            <span className="text-error text-xs mt-1 block">{errors.actual_stock}</span>
                        )}
                    </div>

                    <div>
                        <label className="label py-1">
                            <span className="label-text font-semibold text-xs text-base-content">
                                Tanggal & Jam Verifikasi <span className="text-error">*</span>
                            </span>
                        </label>
                        <input
                            type="datetime-local"
                            required
                            value={data.last_stock_opname_at}
                            onChange={(e) => setData('last_stock_opname_at', e.target.value)}
                            className="input input-bordered input-sm w-full font-mono text-xs"
                        />
                        {errors.last_stock_opname_at && (
                            <span className="text-error text-xs mt-1 block">{errors.last_stock_opname_at}</span>
                        )}
                    </div>

                    <div className="modal-action pt-2">
                        <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="btn btn-sm btn-warning font-semibold text-neutral-900"
                        >
                            {processing ? 'Menyimpan...' : 'Simpan Stok Opname'}
                        </button>
                    </div>
                </form>
            </div>
            <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
        </div>
    );
}

