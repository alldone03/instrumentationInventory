import { router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { compressImages } from '@/Utils/imageCompressor';

export default function ItemModal({ isOpen, onClose, item = null, locations = [], workAreas = [], types = [], units = [], sapClassifications = [] }) {
    if (!isOpen) return null;

    const defaultUnits = units.length > 0 ? units : [
        'Eaches (EA)',
        'Pieces (PCS)',
        'Kilogram (KG)',
        'Liter (L)',
        'Set (SET)',
        'Roll (ROLL)',
        'Meter (M)',
        'Box (BOX)',
        'Unit (UNT)',
    ];

    const isEdit = Boolean(item);
    const [activeTab, setActiveTab] = useState('workshop'); // 'workshop', 'sap', 'photos'
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [isCompressing, setIsCompressing] = useState(false);

    const getCurrentDateTimeLocal = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const getInitialCreateData = () => {
        let history = {};
        try {
            const saved = localStorage.getItem('item_modal_last_selections');
            if (saved) {
                history = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to parse saved item selections:', e);
        }

        return {
            mn_code: '',
            item_name: '',
            sap_description: '',
            item_category: history.item_category ?? 'consumable_part',
            type: history.type ?? (types[0] || 'Control Valve'),
            unit: history.unit ?? 'Pieces (PCS)',
            no_po: '',
            sap_classification: history.sap_classification ?? '',
            sap_status: history.sap_status ?? '',
            reorder_point: 0,
            min_lot_size: 0,
            system_stock: 1,
            actual_stock: 1,
            last_stock_opname_at: getCurrentDateTimeLocal(),
            location_id: history.location_id ?? (locations[0]?.id || ''),
            owner_work_area_id: history.owner_work_area_id ?? (workAreas[0]?.id || ''),
            notes: '',
            images: [],
        };
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        mn_code: item?.mn_code ?? '',
        item_name: item?.item_name ?? '',
        sap_description: item?.sap_description ?? '',
        item_category: item?.item_category ?? 'consumable_part',
        type: item?.type ?? (types[0] || 'Control Valve'),
        unit: item?.unit ?? 'Pieces (PCS)',
        no_po: item?.no_po ?? '',
        sap_classification: item?.sap_classification ?? '',
        sap_status: item?.sap_status ?? '',
        reorder_point: item?.reorder_point ?? 0,
        min_lot_size: item?.min_lot_size ?? 0,
        system_stock: item?.system_stock ?? 1,
        actual_stock: item?.actual_stock ?? 1,
        last_stock_opname_at: item?.last_stock_opname_at ? item.last_stock_opname_at.slice(0, 16) : getCurrentDateTimeLocal(),
        location_id: item?.location_id ?? (locations[0]?.id || ''),
        owner_work_area_id: item?.owner_work_area_id ?? (workAreas[0]?.id || ''),
        notes: item?.notes ?? '',
        images: [],
    });

    useEffect(() => {
        if (item) {
            setData({
                mn_code: item.mn_code ?? '',
                item_name: item.item_name ?? '',
                sap_description: item.sap_description ?? '',
                item_category: item.item_category ?? 'consumable_part',
                type: item.type ?? (types[0] || 'Control Valve'),
                unit: item.unit ?? 'Pieces (PCS)',
                no_po: item.no_po ?? '',
                sap_classification: item.sap_classification ?? '',
                sap_status: item.sap_status ?? '',
                reorder_point: item.reorder_point ?? 0,
                min_lot_size: item.min_lot_size ?? 0,
                system_stock: item.system_stock ?? 0,
                actual_stock: item.actual_stock ?? 0,
                last_stock_opname_at: item.last_stock_opname_at ? item.last_stock_opname_at.slice(0, 16) : getCurrentDateTimeLocal(),
                location_id: item.location_id ?? (locations[0]?.id || ''),
                owner_work_area_id: item.owner_work_area_id ?? (workAreas[0]?.id || ''),
                notes: item.notes ?? '',
                images: [],
            });
        } else {
            setData(getInitialCreateData());
        }
        setSelectedFiles([]);
        setPreviewUrls([]);
    }, [item, isOpen]);

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setIsCompressing(true);
        try {
            // Compress images client-side before setting to state/form
            const compressedFiles = await compressImages(files, {
                maxWidth: 1600,
                maxHeight: 1600,
                quality: 0.75,
                outputType: 'image/jpeg',
            });

            setSelectedFiles(compressedFiles);
            setData('images', compressedFiles);

            const urls = compressedFiles.map((file) => URL.createObjectURL(file));
            setPreviewUrls(urls);
        } catch (error) {
            console.error('Error compressing images:', error);
            // Fallback to original files if error occurs
            setSelectedFiles(files);
            setData('images', files);
            const urls = files.map((file) => URL.createObjectURL(file));
            setPreviewUrls(urls);
        } finally {
            setIsCompressing(false);
        }
    };

    const saveSelectionHistory = () => {
        try {
            const historyToSave = {
                item_category: data.item_category,
                type: data.type,
                unit: data.unit,
                location_id: data.location_id,
                owner_work_area_id: data.owner_work_area_id,
                sap_classification: data.sap_classification,
                sap_status: data.sap_status,
            };
            localStorage.setItem('item_modal_last_selections', JSON.stringify(historyToSave));
        } catch (e) {
            console.error('Failed to save selection history:', e);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Save selected dropdown history (kategori, type, unit, lokasi, work area, dsb.)
        saveSelectionHistory();

        if (isEdit) {
            // Use POST with FormData to support file upload in Laravel
            post(route('items.update', item.id), {
                forceFormData: true,
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post(route('items.store'), {
                forceFormData: true,
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    };

    const handleSetPrimary = (image) => {
        router.post(route('item-images.set-primary', image.id), {}, {
            preserveScroll: true,
        });
    };

    const handleDeleteImage = (image) => {
        if (confirm('Hapus foto ini?')) {
            router.delete(route('item-images.destroy', image.id), {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-4xl p-6 bg-base-100 shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-base-content/70 hover:bg-base-200"
                >
                    ✕
                </button>

                <div className="mb-4">
                    <span className="badge badge-primary badge-sm font-semibold">
                        {isEdit ? 'Mode Edit Barang' : 'Tambah Barang Baru'}
                    </span>
                    <h3 className="font-extrabold text-xl text-base-content mt-1">
                        {isEdit ? item.item_name : 'Master Barang, Sparepart & Tools'}
                    </h3>
                </div>

                {/* Tabs */}
                <div className="tabs tabs-boxed mb-6 bg-base-200 p-1 flex gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab('workshop')}
                        className={`tab flex-1 font-semibold text-xs transition ${activeTab === 'workshop' ? 'tab-active !bg-primary !text-white shadow-sm' : ''
                            }`}
                    >
                        🏢 Info Workshop & Fisik
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('sap')}
                        className={`tab flex-1 font-semibold text-xs transition ${activeTab === 'sap' ? 'tab-active !bg-primary !text-white shadow-sm' : ''
                            }`}
                    >
                        🏷️ SAP Master Data
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('photos')}
                        className={`tab flex-1 font-semibold text-xs transition ${activeTab === 'photos' ? 'tab-active !bg-primary !text-white shadow-sm' : ''
                            }`}
                    >
                        📸 Foto Produk ({isEdit ? item?.images?.length || 0 : selectedFiles.length})
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* TAB 1: WORKSHOP & STOCK INFO */}
                    {activeTab === 'workshop' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Deskripsi Internal / Nama Barang <span className="text-error">*</span>
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={data.item_name}
                                    onChange={(e) => setData('item_name', e.target.value)}
                                    placeholder="Contoh: IDD IIIA Flame Detector Amplifier"
                                    className="input input-bordered input-sm w-full"
                                />
                                {errors.item_name && <span className="text-error text-xs">{errors.item_name}</span>}
                            </div>

                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Kategori Barang <span className="text-error">*</span>
                                    </span>
                                </label>
                                <select
                                    value={data.item_category}
                                    onChange={(e) => setData('item_category', e.target.value)}
                                    className="select select-bordered w-full"
                                >
                                    <option value="consumable_part">Sparepart / Material Habis Pakai</option>
                                    <option value="tool">Tools / Alat Kerja (Wajib Dikembalikan)</option>
                                </select>
                            </div>

                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Technical Type <span className="text-error">*</span>
                                    </span>
                                </label>
                                <select
                                    value={data.type}
                                    onChange={(e) => setData('type', e.target.value)}
                                    className="select select-bordered  w-full"
                                >
                                    {types.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Satuan Unit <span className="text-error">*</span>
                                    </span>
                                </label>
                                <select
                                    value={data.unit}
                                    onChange={(e) => setData('unit', e.target.value)}
                                    className="select select-bordered  w-full"
                                >
                                    {defaultUnits.map((u) => (
                                        <option key={u} value={u}>
                                            {u}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Lokasi Rak / Gudang
                                    </span>
                                </label>
                                <select
                                    value={data.location_id}
                                    onChange={(e) => setData('location_id', e.target.value)}
                                    className="select select-bordered  w-full"
                                >
                                    <option value="">Pilih Lokasi...</option>
                                    {locations.map((loc) => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Area Kepemilikan (Owner Work Area) <span className="text-error">*</span>
                                    </span>
                                </label>
                                <select
                                    value={data.owner_work_area_id}
                                    onChange={(e) => setData('owner_work_area_id', e.target.value)}
                                    className="select select-bordered  w-full"
                                >
                                    {workAreas.map((area) => (
                                        <option key={area.id} value={area.id}>
                                            {area.name}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-[11px] text-base-content/60 mt-1 block">
                                    *Pilih "Umum / Shared" agar dapat diambil bebas tanpa persetujuan lintas-area.
                                </span>
                            </div>

                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Stok Sistem (Current Available) <span className="text-error">*</span>
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={data.system_stock}
                                    onChange={(e) => setData('system_stock', e.target.value)}
                                    className="input input-bordered input-sm w-full font-mono"
                                />
                                {errors.system_stock && <span className="text-error text-xs">{errors.system_stock}</span>}
                            </div>

                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Stok Fisik Aktual (Stock Opname)
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={data.actual_stock}
                                    onChange={(e) => setData('actual_stock', e.target.value)}
                                    className="input input-bordered input-sm w-full font-mono"
                                />
                            </div>

                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Tanggal Terakhir Stok Opname
                                    </span>
                                </label>
                                <input
                                    type="datetime-local"
                                    value={data.last_stock_opname_at}
                                    onChange={(e) => setData('last_stock_opname_at', e.target.value)}
                                    className="input input-bordered input-sm w-full font-mono text-xs"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Catatan Operasional / Notes
                                    </span>
                                </label>
                                <textarea
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder="Contoh: hanya di incenerator 02/06 (saat ini)..."
                                    rows="2"
                                    className="textarea textarea-bordered text-xs w-full"
                                ></textarea>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: SAP MASTER DATA */}
                    {activeTab === 'sap' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Nomor SAP / MN Code (Nullable)
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={data.mn_code}
                                    onChange={(e) => setData('mn_code', e.target.value)}
                                    placeholder="Contoh: 6193311 (Kosongkan jika belum ada)"
                                    className="input input-bordered input-sm w-full font-mono"
                                />
                                <span className="text-[11px] text-base-content/60 mt-1 block">
                                    *Kosongkan bila barang/tools belum terdaftar di SAP.
                                </span>
                            </div>

                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Nomor PO Code (Nullable)
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={data.no_po}
                                    onChange={(e) => setData('no_po', e.target.value)}
                                    placeholder="Contoh: 519870237840 (Kosongkan jika belum ada)"
                                    className="input input-bordered input-sm w-full font-mono"
                                />
                                <span className="text-[11px] text-base-content/60 mt-1 block">
                                    *Kosongkan bila barang/tools belum ada PO.
                                </span>
                            </div>

                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Deskripsi Standar SAP
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={data.sap_description}
                                    onChange={(e) => setData('sap_description', e.target.value)}
                                    placeholder="Contoh: IDD IIIA FLAME DETECTOR AMMPLIFIER -- D-"
                                    className="input input-bordered input-sm w-full font-mono text-xs"
                                />
                            </div>

                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        SAP Klasifikasi
                                    </span>
                                </label>
                                <select
                                    value={data.sap_classification}
                                    onChange={(e) => setData('sap_classification', e.target.value)}
                                    className="select select-bordered  w-full"
                                >
                                    <option value="">Pilih Klasifikasi...</option>
                                    {sapClassifications.map((sc) => (
                                        <option key={sc} value={sc}>
                                            {sc}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        SAP MRP Status
                                    </span>
                                </label>
                                <select
                                    value={data.sap_status}
                                    onChange={(e) => setData('sap_status', e.target.value)}
                                    className="select select-bordered  w-full"
                                >
                                    <option value="">None / Tidak Ada</option>
                                    <option value="PD">PD (Standard MRP)</option>
                                    <option value="ND">ND (No Planning)</option>
                                    <option value="VB">VB (Manual Reorder Point)</option>
                                </select>
                            </div>

                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Reorder Point
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={data.reorder_point}
                                    onChange={(e) => setData('reorder_point', e.target.value)}
                                    className="input input-bordered input-sm w-full font-mono"
                                />
                            </div>

                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Min Lot Size
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={data.min_lot_size}
                                    onChange={(e) => setData('min_lot_size', e.target.value)}
                                    className="input input-bordered input-sm w-full font-mono"
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB 3: PRODUCT PHOTOS */}
                    {activeTab === 'photos' && (
                        <div className="space-y-4">
                            <div>
                                <label className="label py-1">
                                    <span className="label-text font-bold text-xs text-base-content">
                                        Unggah Foto Produk Baru (Multi-Foto)
                                    </span>
                                </label>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    disabled={isCompressing}
                                    onChange={handleFileChange}
                                    className="file-input file-input-bordered file-input-sm w-full"
                                />
                                {isCompressing && (
                                    <div className="flex items-center gap-2 mt-1.5 text-xs text-primary font-medium">
                                        <span className="loading loading-spinner loading-xs"></span>
                                        <span>Mengompres foto sebelum diunggah...</span>
                                    </div>
                                )}
                                <span className="text-[11px] text-base-content/60 mt-1 block">
                                    Pilih satu atau lebih file foto (foto akan otomatis dioptimasi & dikompresi agar ukuran kecil dan cepat diunggah).
                                </span>
                            </div>

                            {/* Preview of newly selected files */}
                            {previewUrls.length > 0 && (
                                <div>
                                    <span className="text-xs font-semibold text-primary block mb-2">
                                        Foto baru yang akan diunggah ({previewUrls.length}):
                                    </span>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {previewUrls.map((url, i) => (
                                            <div key={i} className="relative rounded-lg overflow-hidden border border-base-300 h-24">
                                                <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Existing photos for edit mode */}
                            {isEdit && item.images && item.images.length > 0 && (
                                <div className="mt-4 border-t border-base-200 pt-4">
                                    <span className="text-xs font-bold text-base-content block mb-2">
                                        Foto yang sudah tersimpan:
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {item.images.map((img) => (
                                            <div
                                                key={img.id}
                                                className={`relative rounded-lg overflow-hidden border-2 p-1 bg-base-100 ${img.is_primary ? 'border-primary ring-2 ring-primary/20' : 'border-base-300'
                                                    }`}
                                            >
                                                <div className="h-28 rounded overflow-hidden">
                                                    <img src={img.image_url} alt="Item" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="mt-2 flex items-center justify-between gap-1">
                                                    {img.is_primary ? (
                                                        <span className="badge badge-primary badge-xs text-[10px]">Utama</span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetPrimary(img)}
                                                            className="btn btn-xs btn-outline btn-primary text-[10px] h-6 min-h-0"
                                                        >
                                                            Set Utama
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteImage(img)}
                                                        className="btn btn-xs btn-error btn-ghost text-[10px] h-6 min-h-0 text-error"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="modal-action border-t border-base-200 pt-4 mt-6">
                        <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={processing || isCompressing}
                            className="btn btn-sm btn-primary font-semibold text-white px-6"
                        >
                            {isCompressing ? 'Mengompres Foto...' : processing ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Barang'}
                        </button>
                    </div>
                </form>
            </div>
            <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
        </div>
    );
}

