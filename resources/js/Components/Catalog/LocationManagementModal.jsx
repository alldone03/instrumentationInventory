import { useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function LocationManagementModal({ isOpen, onClose, locations = [] }) {
    if (!isOpen) return null;

    const [searchTerm, setSearchTerm] = useState('');
    const [editingLocation, setEditingLocation] = useState(null);

    // Form for Adding New Location
    const addForm = useForm({
        name: '',
    });

    // Form for Editing Existing Location
    const editForm = useForm({
        name: '',
    });

    const handleCreate = (e) => {
        e.preventDefault();
        addForm.post(route('locations.store'), {
            preserveScroll: true,
            onSuccess: () => {
                addForm.reset();
            },
        });
    };

    const handleStartEdit = (loc) => {
        setEditingLocation(loc);
        editForm.setData('name', loc.name);
        editForm.clearErrors();
    };

    const handleCancelEdit = () => {
        setEditingLocation(null);
        editForm.reset();
        editForm.clearErrors();
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        if (!editingLocation) return;

        editForm.put(route('locations.update', editingLocation.id), {
            preserveScroll: true,
            onSuccess: () => {
                setEditingLocation(null);
                editForm.reset();
            },
        });
    };

    const handleDelete = (loc) => {
        if (loc.items_count > 0) {
            alert(`Lokasi "${loc.name}" tidak dapat dihapus karena sedang digunakan oleh ${loc.items_count} barang.`);
            return;
        }

        if (confirm(`Yakin ingin menghapus lokasi "${loc.name}"?`)) {
            editForm.delete(route('locations.destroy', loc.id), {
                preserveScroll: true,
            });
        }
    };

    const filteredLocations = locations.filter((loc) =>
        loc.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="modal modal-open z-50">
            <div className="modal-box max-w-2xl bg-base-100 p-6 rounded-2xl shadow-2xl relative border border-base-200">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-base-200">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📍</span>
                        <div>
                            <h3 className="font-bold text-lg text-base-content">
                                Kelola Master Lokasi Gudang & Rak
                            </h3>
                            <p className="text-xs text-base-content/60">
                                Tambah, ubah, atau hapus lokasi rak penyimpanan barang/tools ({locations.length} lokasi terdaftar).
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="btn btn-sm btn-circle btn-ghost text-base-content/60 hover:text-base-content"
                    >
                        ✕
                    </button>
                </div>

                {/* Form Tambah Lokasi Baru */}
                <form onSubmit={handleCreate} className="mt-4 p-3 bg-base-200/50 rounded-xl border border-base-200">
                    <label className="text-xs font-bold text-base-content block mb-1">
                        + Tambah Lokasi / Rak Baru
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Contoh: GA. Rak 6A, L1. Rak 6, Gudang Atas..."
                            value={addForm.data.name}
                            onChange={(e) => addForm.setData('name', e.target.value)}
                            className="input input-bordered input-sm flex-1"
                            required
                        />
                        <button
                            type="submit"
                            disabled={addForm.processing || !addForm.data.name.trim()}
                            className="btn btn-primary btn-sm text-white font-semibold shrink-0"
                        >
                            {addForm.processing ? 'Menyimpan...' : 'Tambah'}
                        </button>
                    </div>
                    {addForm.errors.name && (
                        <span className="text-error text-xs mt-1 block">{addForm.errors.name}</span>
                    )}
                </form>

                {/* Search Bar */}
                <div className="mt-4">
                    <input
                        type="text"
                        placeholder="Cari lokasi/rak..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input input-bordered input-sm w-full"
                    />
                </div>

                {/* Daftar Lokasi */}
                <div className="mt-3 max-h-72 overflow-y-auto space-y-2 pr-1">
                    {filteredLocations.length === 0 ? (
                        <div className="text-center py-8 text-xs text-base-content/50">
                            Tidak ada lokasi yang cocok.
                        </div>
                    ) : (
                        filteredLocations.map((loc) => {
                            const isBeingEdited = editingLocation?.id === loc.id;

                            if (isBeingEdited) {
                                return (
                                    <form
                                        key={loc.id}
                                        onSubmit={handleUpdate}
                                        className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/30"
                                    >
                                        <input
                                            type="text"
                                            value={editForm.data.name}
                                            onChange={(e) => editForm.setData('name', e.target.value)}
                                            className="input input-bordered input-sm flex-1 font-medium"
                                            required
                                            autoFocus
                                        />
                                        <button
                                            type="submit"
                                            disabled={editForm.processing || !editForm.data.name.trim()}
                                            className="btn btn-xs btn-success text-white font-semibold"
                                        >
                                            Simpan
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="btn btn-xs btn-ghost"
                                        >
                                            Batal
                                        </button>
                                    </form>
                                );
                            }

                            return (
                                <div
                                    key={loc.id}
                                    className="flex items-center justify-between p-2.5 rounded-lg bg-base-100 hover:bg-base-200/50 border border-base-200 transition"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs text-base-content/50">📍</span>
                                        <span className="text-sm font-semibold text-base-content truncate">
                                            {loc.name}
                                        </span>
                                        <span
                                            className={`badge badge-xs text-[10px] ${
                                                loc.items_count > 0 ? 'badge-info badge-outline' : 'badge-ghost'
                                            }`}
                                        >
                                            {loc.items_count || 0} barang
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleStartEdit(loc)}
                                            className="btn btn-xs btn-ghost text-primary hover:bg-primary/10"
                                            title="Ubah nama lokasi"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(loc)}
                                            disabled={loc.items_count > 0}
                                            className={`btn btn-xs btn-ghost text-error hover:bg-error/10 ${
                                                loc.items_count > 0 ? 'opacity-30 cursor-not-allowed' : ''
                                            }`}
                                            title={
                                                loc.items_count > 0
                                                    ? 'Tidak dapat dihapus karena masih ada barang di lokasi ini'
                                                    : 'Hapus lokasi'
                                            }
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="modal-action border-t border-base-200 pt-3 mt-4">
                    <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">
                        Tutup
                    </button>
                </div>
            </div>
            <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
        </div>
    );
}
