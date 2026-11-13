import { useState } from 'react';

export default function PhotoGalleryModal({ item, isOpen, onClose }) {
    if (!isOpen || !item) return null;

    const images = item.images && item.images.length > 0 ? item.images : [];
    const [selectedIndex, setSelectedIndex] = useState(0);

    const activeImage = images[selectedIndex] || null;

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-3xl p-6 bg-base-100 shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-base-content/70 hover:bg-base-200"
                >
                    ✕
                </button>

                <div className="mb-4">
                    <div className="flex items-center gap-2">
                        <span className="badge badge-primary badge-sm font-semibold">
                            {item.mn_code ? `MN: ${item.mn_code}` : 'NO MN'}
                        </span>
                        <span className="badge badge-outline badge-sm">{item.type}</span>
                    </div>
                    <h3 className="font-bold text-lg text-base-content mt-1">{item.item_name}</h3>
                    {item.sap_description && (
                        <p className="text-xs text-base-content/60 font-mono">{item.sap_description}</p>
                    )}
                </div>

                {images.length > 0 ? (
                    <div className="space-y-4">
                        {/* Main Image Display */}
                        <div className="w-full h-80 sm:h-96 rounded-xl bg-base-200/60 border border-base-300 flex items-center justify-center overflow-hidden relative">
                            {activeImage && (
                                <img
                                    src={activeImage.image_url}
                                    alt={item.item_name}
                                    className="w-full h-full object-contain"
                                />
                            )}
                            {activeImage?.is_primary && (
                                <div className="absolute top-3 left-3">
                                    <span className="badge badge-success text-white font-semibold shadow-sm">
                                        ★ Foto Utama
                                    </span>
                                </div>
                            )}
                            <div className="absolute bottom-3 right-3 bg-base-900/70 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
                                {selectedIndex + 1} / {images.length}
                            </div>
                        </div>

                        {/* Thumbnails row */}
                        {images.length > 1 && (
                            <div className="flex items-center gap-2 overflow-x-auto py-2">
                                {images.map((img, idx) => (
                                    <button
                                        key={img.id || idx}
                                        onClick={() => setSelectedIndex(idx)}
                                        className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition ${
                                            selectedIndex === idx
                                                ? 'border-primary ring-2 ring-primary/30'
                                                : 'border-base-300 opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        <img
                                            src={img.image_url}
                                            alt={`Thumbnail ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full h-64 rounded-xl bg-base-200 border border-dashed border-base-300 flex flex-col items-center justify-center text-base-content/40">
                        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm">Belum ada foto untuk produk ini</span>
                    </div>
                )}

                <div className="modal-action">
                    <button onClick={onClose} className="btn btn-sm btn-ghost">
                        Tutup
                    </button>
                </div>
            </div>
            <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
        </div>
    );
}

