import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ItemCard from '@/Components/Catalog/ItemCard';
import ItemModal from '@/Components/Catalog/ItemModal';
import PhotoGalleryModal from '@/Components/Catalog/PhotoGalleryModal';
import StockOpnameModal from '@/Components/Catalog/StockOpnameModal';
import CheckoutDrawer from '@/Components/Cart/CheckoutDrawer';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function Index({ items, filters = {}, locations = [], workAreas = [], types = [], units = [], sapClassifications = [] }) {
    const { auth } = usePage().props;
    const user = auth.user;

    const [search, setSearch] = useState(filters.search || '');
    const [selectedType, setSelectedType] = useState(filters.type || '');
    const [selectedLocation, setSelectedLocation] = useState(filters.location_id || '');
    const [selectedArea, setSelectedArea] = useState(filters.owner_work_area_id || '');
    const [selectedCategory, setSelectedCategory] = useState(filters.item_category || '');

    // Cart state persisted in localStorage
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem('instrument_inventory_cart');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('instrument_inventory_cart', JSON.stringify(cart));
        } catch (e) {
            console.error('Failed to save cart', e);
        }
    }, [cart]);

    // Modals
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [galleryItem, setGalleryItem] = useState(null);

    const [isOpnameOpen, setIsOpnameOpen] = useState(false);
    const [opnameItem, setOpnameItem] = useState(null);

    const [isCheckoutDrawerOpen, setIsCheckoutDrawerOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    // Filter Trigger
    const applyFilters = (newFilters) => {
        router.get(
            route('items.index'),
            {
                ...filters,
                ...newFilters,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        applyFilters({ search });
    };

    const handleResetFilters = () => {
        setSearch('');
        setSelectedType('');
        setSelectedLocation('');
        setSelectedArea('');
        setSelectedCategory('');
        router.get(route('items.index'), {}, { preserveScroll: true });
    };

    // Cart handlers
    const handleAddToCart = (item) => {
        let addedCount = 1;
        setCart((prev) => {
            const existing = prev.find((i) => i.id === item.id);
            if (existing) {
                if (existing.quantity < item.system_stock) {
                    addedCount = existing.quantity + 1;
                    return prev.map((i) =>
                        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                    );
                }
                return prev;
            }
            return [...prev, { ...item, quantity: 1 }];
        });

        const actionText = item.item_category === 'tool' ? 'Peminjaman alat' : 'Pengambilan material';
        setToastMessage(`✓ ${actionText} "${item.item_name}" berhasil dimasukkan ke keranjang`);
        setTimeout(() => {
            setToastMessage((current) => (current ? null : current));
        }, 3500);
    };

    const handleUpdateQuantity = (itemId, quantity) => {
        if (quantity <= 0) {
            handleRemoveFromCart(itemId);
            return;
        }
        setCart((prev) =>
            prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
        );
    };

    const handleRemoveFromCart = (itemId) => {
        setCart((prev) => prev.filter((i) => i.id !== itemId));
    };

    const handleClearCart = () => {
        setCart([]);
    };

    const totalCartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

    return (
        <AuthenticatedLayout cartCount={totalCartCount} onOpenCart={() => setIsCheckoutDrawerOpen(true)}>
            <Head title="Katalog Barang & Tools" />

            {/* Toast Notification Top Right */}
            {toastMessage && (
                <div className="fixed top-20 right-6 z-50 animate-bounce-short">
                    <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700/60 max-w-sm">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-sm">
                            ✓
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-100 line-clamp-2">
                                {toastMessage}
                            </p>
                        </div>
                        <button
                            onClick={() => setIsCheckoutDrawerOpen(true)}
                            className="btn btn-xs bg-blue-600 hover:bg-blue-500 text-white border-0 font-semibold shrink-0"
                        >
                            Lihat
                        </button>
                        <button
                            onClick={() => setToastMessage(null)}
                            className="text-slate-400 hover:text-white text-xs ml-1"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header & Quick Action Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="badge badge-primary font-mono text-xs">Workshop Inventory</span>
                            <span className="badge badge-outline text-xs">SAP Synchronized</span>
                        </div>
                        <h1 className="text-2xl font-black text-base-content tracking-tight">
                            Katalog Gudang, Sparepart & Tools
                        </h1>
                        <p className="text-xs text-base-content/60 mt-1">
                            Sistem pengelolaan pengambilan sparepart dan peminjaman alat kerja instrumen lapangan.
                        </p>
                    </div>

                    <div className="flex items-center flex-wrap gap-2.5">
                        {/* SAP Export Button */}
                        <a
                            href={route('items.export-sap')}
                            className="btn btn-outline btn-sm font-semibold gap-1.5 hover:bg-success hover:text-white hover:border-success transition"
                            title="Unduh seluruh data sesuai format SAP"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Export SAP (CSV)</span>
                        </a>

                        {/* Add Item Button for TKO and Admin */}
                        {(user?.role === 'tkno_admin' || user?.role === 'tko') && (
                            <button
                                onClick={() => {
                                    setEditingItem(null);
                                    setIsItemModalOpen(true);
                                }}
                                className="btn btn-primary btn-sm text-white font-semibold gap-1.5 shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Tambah Barang Baru</span>
                            </button>
                        )}

                        {/* Floating Cart Open Button */}
                        <button
                            onClick={() => setIsCheckoutDrawerOpen(true)}
                            className="btn btn-neutral btn-sm font-semibold gap-2 shadow-sm relative"
                        >
                            <span>🛒 Keranjang</span>
                            {totalCartCount > 0 && (
                                <span className="badge badge-primary badge-sm font-mono font-bold text-white">
                                    {totalCartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Filters & Instant Search Bar */}
                <div className="bg-base-100 p-4 rounded-2xl border border-base-300 shadow-sm space-y-3">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nama barang, deskripsi SAP, atau nomor MN (e.g. 6193311)..."
                                className="input input-bordered input-sm w-full pl-9 text-xs"
                            />
                            <svg
                                className="w-4 h-4 absolute left-3 top-2.5 text-base-content/40"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>

                        {/* Filter Category */}
                        <select
                            value={selectedCategory}
                            onChange={(e) => {
                                setSelectedCategory(e.target.value);
                                applyFilters({ item_category: e.target.value });
                            }}
                            className="select select-bordered select-sm text-xs"
                        >
                            <option value="">Semua Kategori</option>
                            <option value="consumable_part">📦 Sparepart (Consumable)</option>
                            <option value="tool">🔧 Tools (Returnable)</option>
                        </select>

                        {/* Filter Type */}
                        <select
                            value={selectedType}
                            onChange={(e) => {
                                setSelectedType(e.target.value);
                                applyFilters({ type: e.target.value });
                            }}
                            className="select select-bordered select-sm text-xs"
                        >
                            <option value="">Semua Tipe Teknik</option>
                            {types.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>

                        {/* Filter Area */}
                        <select
                            value={selectedArea}
                            onChange={(e) => {
                                setSelectedArea(e.target.value);
                                applyFilters({ owner_work_area_id: e.target.value });
                            }}
                            className="select select-bordered select-sm text-xs"
                        >
                            <option value="">Semua Area Pemilik</option>
                            {workAreas.map((area) => (
                                <option key={area.id} value={area.id}>
                                    {area.name}
                                </option>
                            ))}
                        </select>

                        {/* Filter Location */}
                        <select
                            value={selectedLocation}
                            onChange={(e) => {
                                setSelectedLocation(e.target.value);
                                applyFilters({ location_id: e.target.value });
                            }}
                            className="select select-bordered select-sm text-xs"
                        >
                            <option value="">Semua Lokasi Rak</option>
                            {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name}
                                </option>
                            ))}
                        </select>

                        <div className="flex gap-2">
                            <button type="submit" className="btn btn-sm btn-primary text-white text-xs px-4">
                                Cari
                            </button>
                            {(search || selectedType || selectedLocation || selectedArea || selectedCategory) && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="btn btn-sm btn-ghost text-xs"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Items Grid */}
                {items.data && items.data.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {items.data.map((item) => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                user={user}
                                onAddToCart={handleAddToCart}
                                onEdit={(item) => {
                                    setEditingItem(item);
                                    setIsItemModalOpen(true);
                                }}
                                onStockOpname={(item) => {
                                    setOpnameItem(item);
                                    setIsOpnameOpen(true);
                                }}
                                onViewGallery={(item) => {
                                    setGalleryItem(item);
                                    setIsGalleryOpen(true);
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-base-100 rounded-2xl border border-base-300 p-12 text-center shadow-sm">
                        <span className="text-5xl block mb-3">🔍</span>
                        <h3 className="font-bold text-lg text-base-content">Tidak ada barang yang ditemukan</h3>
                        <p className="text-xs text-base-content/60 mt-1 max-w-md mx-auto">
                            Coba ubah kata kunci pencarian atau bersihkan filter yang sedang aktif.
                        </p>
                        <button
                            onClick={handleResetFilters}
                            className="btn btn-sm btn-outline mt-4 text-xs font-semibold"
                        >
                            Bersihkan Semua Filter
                        </button>
                    </div>
                )}

                {/* Pagination */}
                {items.links && items.links.length > 3 && (
                    <div className="flex justify-center py-4">
                        <div className="join bg-base-100 border border-base-300 shadow-sm">
                            {items.links.map((link, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                    disabled={!link.url}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`join-item btn btn-sm font-mono text-xs ${
                                        link.active ? 'btn-primary text-white font-bold' : 'btn-ghost'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals & Drawer */}
            <ItemModal
                isOpen={isItemModalOpen}
                item={editingItem}
                onClose={() => {
                    setIsItemModalOpen(false);
                    setEditingItem(null);
                }}
                locations={locations}
                workAreas={workAreas}
                types={types}
                units={units}
                sapClassifications={sapClassifications}
            />

            <StockOpnameModal
                isOpen={isOpnameOpen}
                item={opnameItem}
                onClose={() => {
                    setIsOpnameOpen(false);
                    setOpnameItem(null);
                }}
            />

            <PhotoGalleryModal
                isOpen={isGalleryOpen}
                item={galleryItem}
                onClose={() => {
                    setIsGalleryOpen(false);
                    setGalleryItem(null);
                }}
            />

            <CheckoutDrawer
                isOpen={isCheckoutDrawerOpen}
                onClose={() => setIsCheckoutDrawerOpen(false)}
                cartItems={cart}
                user={user}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveFromCart={handleRemoveFromCart}
                onClearCart={handleClearCart}
            />
        </AuthenticatedLayout>
    );
}

