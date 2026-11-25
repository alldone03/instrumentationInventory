import RiwayatPengambilan from "./RiwayatPengambilan";

export default function ItemCard({
    item,
    user,
    onAddToCart,
    onEdit,
    onDelete,
    onStockOpname,
    onViewGallery,
    isSelected = false,
    onToggleSelect = null,
}) {
    const isShared = item.owner_work_area
        ? item.owner_work_area.name.toLowerCase().includes('umum') ||
        item.owner_work_area.name.toLowerCase().includes('shared')
        : false;

    const canManage = user?.role === 'tkno_admin' || user?.role === 'tko';
    const isTknoAdmin = user?.role === 'tkno_admin';
    const primaryImg = item.primary_image_url || item.images?.[0]?.image_url;
    const photoCount = item.images?.length || 0;

    const isLowStock = item.system_stock <= (item.reorder_point || 0);

    // Ambil nomor PO dan tanggal kedatangan dari po_numbers atau no_po
    const poList = Array.isArray(item.po_numbers) ? item.po_numbers : [];
    const validPoItem = poList.find((p) => p && p.number && p.number.trim() !== '');
    const poNumber = validPoItem ? validPoItem.number.trim() : (item.no_po && item.no_po.trim() !== '' ? item.no_po.trim() : null);

    const validDateItem = poList.find((p) => p && p.date && p.date.trim() !== '');
    const poDate = validDateItem ? validDateItem.date.trim() : null;

    const totalPoCount = poList.filter((p) => p && p.number && p.number.trim() !== '').length;

    const formatDateDDMMYYYYHHMMSS = (dateString) => {
        if (!dateString) return '-';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';

        const pad = (num) => String(num).padStart(2, '0');

        const dd = pad(date.getDate());
        const mm = pad(date.getMonth() + 1); // Bulan di JS mulai dari 0
        const yyyy = date.getFullYear();

        const hh = pad(date.getHours());
        const min = pad(date.getMinutes());
        const ss = pad(date.getSeconds());

        return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
    };
    return (
        <div className={`card bg-base-100 shadow-md hover:shadow-xl transition-all duration-200 border flex flex-col justify-between overflow-hidden group ${isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-base-300'}`}>
            {/* Top Media Section */}
            <div className="relative w-full h-48 bg-base-200/80 overflow-hidden cursor-pointer" onClick={() => onViewGallery(item)}>
                {primaryImg ? (
                    <img
                        src={primaryImg}
                        alt={item.item_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-base-content/40 bg-base-200">
                        <svg className="w-10 h-10 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[11px] font-medium">Klik untuk lihat foto</span>
                    </div>
                )}

                {/* Checkbox for SAP selection (Admin) */}
                {onToggleSelect && (
                    <div
                        className="absolute top-2 right-2 z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <label className="cursor-pointer bg-base-100/90 backdrop-blur-xs p-1.5 rounded-lg border border-base-300 shadow-sm flex items-center gap-1 hover:bg-base-100">
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => onToggleSelect(item.id)}
                                className="checkbox checkbox-primary checkbox-sm"
                            />
                        </label>
                    </div>
                )}

                {/* Badges on image */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 max-w-[80%]">
                    {item.mn_code && item.mn_code.trim() !== '' ? (
                        <span className="badge badge-primary font-mono text-[11px] font-bold shadow-sm">
                            MN: {item.mn_code}
                        </span>
                    ) : poNumber ? (
                        <span className="badge badge-secondary font-mono text-[11px] font-bold shadow-sm truncate">
                            PO: {poNumber}
                            {totalPoCount > 1 ? ` (+${totalPoCount - 1})` : ''}
                        </span>
                    ) : poDate ? (
                        <span className="badge badge-warning text-warning-content font-mono text-[11px] font-bold shadow-sm truncate">
                            📅 {poDate}
                        </span>
                    ) : (
                        <span className="badge badge-neutral text-white font-mono text-[11px] font-bold shadow-sm">
                            Belum lengkap
                        </span>
                    )}

                    <span className={`badge badge-sm font-semibold shadow-sm ${item.item_category === 'tool' ? 'badge-secondary text-white' : 'badge-ghost bg-base-100/90 text-base-content'
                        }`}>
                        {item.item_category === 'tool' ? '🔧 Tool (Kembali)' : '📦 Consumable'}
                    </span>

                    <span className="badge badge-outline badge-sm font-bold bg-white/90 text-slate-700 shadow-sm">
                        {item.unit || 'PCS'}
                    </span>
                </div>

                {photoCount > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-xs">
                        <span>📷</span>
                        <span>{photoCount} Foto</span>
                    </div>
                )}
            </div>

            {/* Card Body */}
            <div className="card-body p-4 flex-1 flex flex-col justify-between">
                <div>
                    {/* Technical Type & Location */}
                    <div className="flex items-center justify-between text-[11px] text-base-content/60 mb-1.5">
                        <span className="font-semibold text-primary">{item.type}</span>
                        <span className="truncate max-w-[140px]" title={item.location?.name}>
                            📍 {item.location?.name || 'Gudang'}
                        </span>
                    </div>

                    {/* Internal Name (bold) */}
                    <h2 className="card-title text-base font-bold text-base-content line-clamp-2 leading-snug mb-1">
                        {item.item_name}
                    </h2>

                    {/* SAP Description (muted) */}
                    {item.sap_description && (
                        <p className="text-xs text-base-content/60 font-mono line-clamp-1 mb-2">
                            {item.sap_description}
                        </p>
                    )}

                    {/* PO Numbers list if available */}
                    {item.po_numbers && item.po_numbers.length > 0 && item.po_numbers.some(p => p.number || p.date) && (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {item.po_numbers.map((p, idx) => (p.number || p.date) && (
                                <span key={idx} className="badge badge-xs badge-outline font-mono text-[10px] py-1.5 px-2">
                                    PO: {p.number || '-'}{p.date ? ` (${p.date})` : ''}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Ownership Area Badge */}
                    <div className="mb-3">
                        {isShared ? (
                            <span className="badge badge-success badge-sm text-white font-medium text-[11px]">
                                🌐 Umum / Shared (Bebas Ambil)
                            </span>
                        ) : item.owner_work_area?.name?.toLowerCase().trim() === 'shop' ? (
                            <span className="badge badge-error badge-sm text-white font-medium text-[11px]">
                                ⚡ Area: Shop (Admin)
                            </span>
                        ) : (
                            <span className="badge badge-info badge-outline badge-sm text-[11px] font-medium">
                                🔒 Area: {item.owner_work_area?.name || 'Khusus'}
                            </span>
                        )}
                    </div>

                    {/* Stock Status Box */}
                    <div className="bg-base-200/60 rounded-lg p-2.5 border border-base-300 text-xs mb-3 space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-base-content/70">Stok Sistem:</span>
                            <span className={`font-mono font-bold text-sm ${item.system_stock === 0 ? 'text-error' : isLowStock ? 'text-warning' : 'text-success'
                                }`}>
                                {item.system_stock} {item.unit || 'PCS'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-base-content/60 text-[11px]">
                            <span>Hasil Opname Fisik:</span>
                            <span className="font-mono font-medium">{item.actual_stock} {item.unit || 'PCS'}</span>
                        </div>
                    </div>

                    {/* Notes if any */}
                    {item.notes && (
                        <div className="text-[11px] text-base-content/70 bg-warning/10 border-l-2 border-warning px-2 py-1 rounded mb-3 line-clamp-2">
                            <span className="font-semibold">Catatan:</span> {item.notes}
                        </div>
                    )}
                    <RiwayatPengambilan history={item.transaction_items
                        ? item.transaction_items.map((t) => ({
                            id: t.id,
                            waktu: formatDateDDMMYYYYHHMMSS(t.inventory_transaction?.created_at) ?? '-',
                            pemohon: t.inventory_transaction?.requester_name ?? '-',
                            qty: t.quantity ?? 0,
                            buktiFoto: t.inventory_transaction?.checkout_photo_url ?? '',
                        }))
                        : []} />
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-base-200 flex flex-col gap-1.5">
                    <button
                        onClick={() => onAddToCart(item)}
                        disabled={item.system_stock <= 0}
                        className="btn btn-primary btn-sm w-full font-semibold text-white shadow-sm disabled:bg-base-300"
                    >
                        {item.system_stock <= 0
                            ? 'Stok Habis'
                            : item.item_category === 'tool'
                                ? '+ Pinjam Alat'
                                : '+ Ambil Material'}
                    </button>

                    {canManage && (
                        <div className={`grid ${isTknoAdmin ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5`}>
                            <button
                                onClick={() => onEdit(item)}
                                className="btn btn-ghost btn-xs border border-base-300 text-xs font-medium"
                            >
                                ✏️ Edit
                            </button>
                            <button
                                onClick={() => onStockOpname(item)}
                                className="btn btn-ghost btn-xs border border-base-300 text-xs font-medium text-warning-content"
                            >
                                📋 Opname
                            </button>
                            {isTknoAdmin && onDelete && (
                                <button
                                    onClick={() => onDelete(item)}
                                    className="btn btn-ghost btn-xs border border-error/30 text-error hover:bg-error hover:text-white text-xs font-medium"
                                    title="Hapus barang"
                                >
                                    🗑️ Hapus
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

