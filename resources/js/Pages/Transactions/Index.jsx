import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import RejectModal from '@/Components/Transactions/RejectModal';
import ReturnModal from '@/Components/Transactions/ReturnModal';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

export default function Index({
    pendingTransactions = [],
    historyTransactions = { data: [] },
    borrowedCount = 0,
    availableItems = [],
    requesterNames = [],
    filters = {},
}) {
    const { auth } = usePage().props;
    const user = auth.user;

    const [activeTab, setActiveTab] = useState('history'); // 'pending', 'history'

    const [search, setSearch] = useState(filters.search || '');
    const [sortBy, setSortBy] = useState(filters.sort_by || 'created_at');
    const [sortDir, setSortDir] = useState(filters.sort_dir || 'desc');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const searchTimeoutRef = useRef(null);

    const [selectedReturnTrx, setSelectedReturnTrx] = useState(null);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

    const [selectedRejectTrx, setSelectedRejectTrx] = useState(null);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    const [previewPhoto, setPreviewPhoto] = useState(null);

    // Infinite scroll state for unified transaction log
    const [allHistory, setAllHistory] = useState(historyTransactions.data || []);
    const [nextHistoryUrl, setNextHistoryUrl] = useState(historyTransactions.next_page_url);
    const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false);
    const isLoadingMoreHistoryRef = useRef(false);
    const loadMoreHistoryRef = useRef(null);

    useEffect(() => {
        setAllHistory(historyTransactions.data || []);
        setNextHistoryUrl(historyTransactions.next_page_url);
    }, [historyTransactions]);

    useEffect(() => {
        if (activeTab !== 'history' || !nextHistoryUrl) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && nextHistoryUrl && !isLoadingMoreHistoryRef.current) {
                    isLoadingMoreHistoryRef.current = true;
                    setIsLoadingMoreHistory(true);
                    axios
                        .get(nextHistoryUrl, { headers: { Accept: 'application/json' } })
                        .then((res) => {
                            const incoming = res.data?.data || [];
                            setAllHistory((prev) => {
                                const existingIds = new Set(prev.map((item) => item.id));
                                return [...prev, ...incoming.filter((item) => !existingIds.has(item.id))];
                            });
                            setNextHistoryUrl(res.data?.next_page_url || null);
                        })
                        .catch((err) => console.error('Failed to load more transactions', err))
                        .finally(() => {
                            isLoadingMoreHistoryRef.current = false;
                            setIsLoadingMoreHistory(false);
                        });
                }
            },
            { rootMargin: '0px', threshold: 0.1 }
        );

        const el = loadMoreHistoryRef.current;
        if (el) observer.observe(el);
        return () => observer.disconnect();
    }, [activeTab, nextHistoryUrl]);

    const handleDeleteTransaction = (trx) => {
        if (confirm(`Apakah Anda yakin ingin menghapus transaksi ${trx.transaction_code}? Stok barang akan disesuaikan kembali.`)) {
            router.delete(route('transactions.destroy', trx.id), {
                preserveScroll: true,
            });
        }
    };

    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, []);

    const applyFilters = (next = {}) => {
        router.get(
            route('transactions.index'),
            {
                search,
                sort_by: sortBy,
                sort_dir: sortDir,
                status: statusFilter,
                ...next,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleSearchChange = (value) => {
        setSearch(value);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            applyFilters({ search: value });
        }, 400);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        applyFilters({ search });
    };

    const handleSortColumn = (column) => {
        const nextDir = sortBy === column && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDir(nextDir);
        applyFilters({ sort_by: column, sort_dir: nextDir });
    };

    const handleResetFilters = () => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        setSearch('');
        setSortBy('created_at');
        setSortDir('desc');
        setStatusFilter('');
        router.get(route('transactions.index'), {}, { preserveState: true, preserveScroll: true });
    };

    const renderSortIndicator = (column) => {
        if (sortBy !== column) return <span className="opacity-30 ml-1">⇅</span>;
        return <span className="text-primary ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>;
    };

    const handleApprove = (trx) => {
        if (confirm(`Setujui transaksi ${trx.transaction_code}? Stok sistem akan langsung dipotong.`)) {
            router.post(route('transactions.approve', trx.id));
        }
    };

    const handleOpenReject = (trx) => {
        setSelectedRejectTrx(trx);
        setIsRejectModalOpen(true);
    };

    const handleOpenReturn = (trx) => {
        setSelectedReturnTrx(trx);
        setIsReturnModalOpen(true);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending_approval':
                return <span className="badge badge-warning text-xs h-full text-center font-semibold">Menunggu Approval</span>;
            case 'borrowed':
                return <span className="badge badge-info text-white text-xs h-full text-center font-semibold">Sedang Dipinjam</span>;
            case 'partially_returned':
                return <span className="badge badge-warning text-xs h-full text-center font-semibold">Dikembalikan Sebagian</span>;
            case 'completed':
                return <span className="badge badge-success text-white h-full text-center text-xs font-semibold">Selesai</span>;
            case 'returned':
                return <span className="badge badge-primary text-white h-full text-center text-xs font-semibold">Dikembalikan</span>;
            case 'rejected':
                return <span className="badge badge-error text-white h-full text-center text-xs font-semibold">Ditolak</span>;
            default:
                return <span className="badge badge-ghost text-xs">{status}</span>;
        }
    };

    const isUnreturnedTool = (trx) =>
        trx.status === 'borrowed' || trx.status === 'partially_returned';

    return (
        <AuthenticatedLayout>
            <Head title="Approval Center & Log Transaksi" />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="badge badge-neutral font-mono text-xs">Approval & Audit Trail</span>
                        </div>
                        <h1 className="text-2xl font-black text-base-content tracking-tight">
                            Pusat Persetujuan & Log Transaksi
                        </h1>
                        <p className="text-xs text-base-content/60 mt-1">
                            Verifikasi otorisasi pengambilan material lintas-area, pemantauan pengembalian alat kerja di lapangan, dan riwayat audit.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {borrowedCount > 0 && (
                            <span className="badge badge-info text-white text-xs py-3 px-3 font-semibold">
                                🔧 {borrowedCount} Alat Sedang Dipinjam
                            </span>
                        )}
                        {user?.work_area && (
                            <span className="badge badge-outline text-xs py-3 px-3">
                                📍 Area Kerja Anda: <b className="ml-1 text-primary">{user.work_area.name}</b>
                            </span>
                        )}
                    </div>
                </div>

                {/* Search & Sorting Toolbar */}
                <div className="bg-base-100 p-4 rounded-2xl border border-base-300 shadow-sm">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-2.5">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Cari No. Transaksi, pemohon, nama barang, atau catatan..."
                                className="input input-bordered input-sm w-full pl-9 text-xs"
                            />
                            <svg
                                className="w-4 h-4 absolute left-3 top-2 text-base-content/40"
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

                        {activeTab === 'history' && (
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    applyFilters({ status: e.target.value });
                                }}
                                className="select select-bordered select-sm text-xs"
                            >
                                <option value="">Semua Status</option>
                                <option value="borrowed">🔧 Sedang Dipinjam</option>
                                <option value="partially_returned">⏳ Dikembalikan Sebagian</option>
                                <option value="returned">✓ Dikembalikan</option>
                                <option value="completed">📦 Selesai (Material)</option>
                                <option value="rejected">✕ Ditolak</option>
                            </select>
                        )}

                        <select
                            value={`${sortBy}:${sortDir}`}
                            onChange={(e) => {
                                const [col, dir] = e.target.value.split(':');
                                setSortBy(col);
                                setSortDir(dir);
                                applyFilters({ sort_by: col, sort_dir: dir });
                            }}
                            className="select select-bordered select-sm text-xs"
                        >
                            <option value="created_at:desc">Urutkan: Terbaru</option>
                            <option value="created_at:asc">Urutkan: Terlama</option>
                            <option value="transaction_code:asc">No. Transaksi (A-Z)</option>
                            <option value="transaction_code:desc">No. Transaksi (Z-A)</option>
                            <option value="requester_name:asc">Pemohon (A-Z)</option>
                            <option value="requester_name:desc">Pemohon (Z-A)</option>
                            <option value="status:asc">Status (A-Z)</option>
                        </select>

                        <div className="flex gap-1.5">
                            <button type="submit" className="btn btn-sm btn-primary text-white text-xs px-4">
                                Cari
                            </button>
                            {(search || statusFilter || sortBy !== 'created_at' || sortDir !== 'desc') && (
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

                {/* Tabs (2 Tabs: Pending Approvals & Unified Log Transaksi) */}
                <div className="tabs tabs-boxed bg-base-100 p-1.5 rounded-xl border border-base-300 shadow-sm flex flex-wrap gap-1">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`tab flex-1 font-bold text-xs py-3 transition ${activeTab === 'pending' ? 'tab-active !bg-warning !text-neutral-900 shadow-sm' : ''
                            }`}
                    >
                        ⏳ Menunggu Persetujuan
                        {pendingTransactions.length > 0 && (
                            <span className="badge badge-error text-white badge-xs ml-2 font-mono">
                                {pendingTransactions.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`tab flex-1 font-bold text-xs py-3 transition ${activeTab === 'history' ? 'tab-active !bg-primary !text-white shadow-sm' : ''
                            }`}
                    >
                        📜 Log Transaksi & Alat Lapangan ({historyTransactions.total || historyTransactions.data.length})
                        {borrowedCount > 0 && (
                            <span className="badge badge-info text-white badge-xs ml-2 font-mono">
                                {borrowedCount} Dipinjam
                            </span>
                        )}
                    </button>
                </div>

                {/* TAB 1: PENDING APPROVALS */}
                {activeTab === 'pending' && (
                    <div className="bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-base-200 bg-base-200/40 flex items-center justify-between">
                            <span className="text-xs font-bold text-base-content">
                                Permintaan Checkout Lintas-Area Yang Membutuhkan Otorisasi
                            </span>
                            <span className="text-xs text-base-content/60">
                                {pendingTransactions.length} Pengajuan
                            </span>
                        </div>

                        {pendingTransactions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="table table-sm text-xs">
                                    <thead>
                                        <tr className="bg-base-200/50 text-base-content/70">
                                            <th
                                                onClick={() => handleSortColumn('transaction_code')}
                                                className="cursor-pointer select-none hover:text-base-content"
                                            >
                                                No. Transaksi {renderSortIndicator('transaction_code')}
                                            </th>
                                            <th
                                                onClick={() => handleSortColumn('created_at')}
                                                className="cursor-pointer select-none hover:text-base-content"
                                            >
                                                Tanggal {renderSortIndicator('created_at')}
                                            </th>
                                            <th
                                                onClick={() => handleSortColumn('requester_name')}
                                                className="cursor-pointer select-none hover:text-base-content"
                                            >
                                                Pemohon & Area {renderSortIndicator('requester_name')}
                                            </th>
                                            <th>Daftar Barang & Qty</th>
                                            <th>Keperluan / WO</th>
                                            <th>Bukti Foto</th>
                                            <th className="text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingTransactions.map((trx) => (
                                            <tr key={trx.id} className="hover:bg-base-200/30">
                                                <td className="font-mono font-bold text-primary">
                                                    {trx.transaction_code}
                                                    <div className="mt-0.5">
                                                        {trx.transaction_type === 'tool_borrow' ? (
                                                            <span className="badge badge-secondary badge-xs">Peminjaman Tool</span>
                                                        ) : (
                                                            <span className="badge badge-ghost badge-xs">Material Habis Pakai</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="text-base-content/70 whitespace-nowrap">
                                                    {new Date(trx.created_at).toLocaleString('id-ID', {
                                                        dateStyle: 'medium',
                                                        timeStyle: 'short',
                                                    })}
                                                </td>
                                                <td>
                                                    <div className="font-bold text-base-content">
                                                        {trx.requester_name || trx.user?.name}
                                                    </div>
                                                    {/* <div className="text-[11px] text-base-content/60">
                                                        {trx.requester_work_area?.name || 'Area Umum'}
                                                    </div> */}
                                                    {trx.user?.badge_number && (
                                                        <div className="text-[10px] font-mono text-base-content/40">
                                                            NIK: {trx.user.badge_number}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="space-y-1">
                                                        {trx.items?.map((tItem) => (
                                                            <div key={tItem.id} className="flex items-center gap-1.5">
                                                                <span className="font-mono font-bold text-primary">
                                                                    {tItem.quantity} {tItem.item?.unit || 'unit'}
                                                                </span>
                                                                <span className="font-medium text-base-content">
                                                                    {tItem.item?.item_name}
                                                                </span>
                                                                <span className="badge badge-xs badge-outline">
                                                                    {tItem.item?.owner_work_area?.name}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="max-w-xs">
                                                    <p className="line-clamp-2 text-base-content/80">
                                                        {trx.purpose_notes}
                                                    </p>
                                                </td>
                                                <td>
                                                    {trx.checkout_photo_url && (
                                                        <button
                                                            onClick={() => setPreviewPhoto({
                                                                title: `Bukti Pengambilan: ${trx.transaction_code}`,
                                                                url: trx.checkout_photo_url,
                                                            })}
                                                            className="w-12 h-12 rounded-lg overflow-hidden border border-base-300 relative group"
                                                        >
                                                            <img
                                                                src={trx.checkout_photo_url}
                                                                alt="Bukti"
                                                                className="w-full h-full object-cover group-hover:scale-110 transition"
                                                            />
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    {(user?.role === 'tkno_admin' || user?.role === 'tko') ? (
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                onClick={() => handleApprove(trx)}
                                                                className="btn btn-success btn-xs text-white font-semibold shadow-sm"
                                                            >
                                                                ✓ Setujui
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenReject(trx)}
                                                                className="btn btn-error btn-xs text-white font-semibold shadow-sm"
                                                            >
                                                                ✕ Tolak
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-base-content/50 italic text-[11px]">
                                                            Menunggu Otorisasi Supervisor
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-base-content/50">
                                <span className="text-4xl block mb-2">🎉</span>
                                <h4 className="font-bold text-sm">Tidak ada permintaan yang menunggu persetujuan</h4>
                                <p className="text-xs text-base-content/60 mt-1">
                                    Semua transaksi telah disetujui atau diproses secara otomatis.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: UNIFIED TRANSACTION & BORROWED TOOLS LOG */}
                {activeTab === 'history' && (
                    <div className="bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-base-200 bg-base-200/40 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-bold text-base-content">
                                Log Audit Transaksi Pengambilan, Peminjaman Lapangan & Pengembalian
                            </span>
                            <span className="text-xs text-base-content/60">
                                Menampilkan {historyTransactions.data?.length || 0} dari {historyTransactions.total || 0} transaksi
                            </span>
                        </div>

                        {allHistory.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="table table-sm text-xs">
                                        <thead>
                                            <tr className="bg-base-200/50 text-base-content/70">
                                                <th
                                                    onClick={() => handleSortColumn('transaction_code')}
                                                    className="cursor-pointer select-none hover:text-base-content"
                                                >
                                                    No. Transaksi {renderSortIndicator('transaction_code')}
                                                </th>
                                                <th
                                                    onClick={() => handleSortColumn('created_at')}
                                                    className="cursor-pointer select-none hover:text-base-content"
                                                >
                                                    Waktu {renderSortIndicator('created_at')}
                                                </th>
                                                <th
                                                    onClick={() => handleSortColumn('requester_name')}
                                                    className="cursor-pointer select-none hover:text-base-content"
                                                >
                                                    Pemohon {renderSortIndicator('requester_name')}
                                                </th>
                                                <th>Barang</th>
                                                <th
                                                    onClick={() => handleSortColumn('status')}
                                                    className="cursor-pointer select-none hover:text-base-content"
                                                >
                                                    Status {renderSortIndicator('status')}
                                                </th>
                                                <th>Bukti Foto</th>
                                                <th>Catatan</th>
                                                <th className="text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allHistory.map((trx) => (
                                                <tr key={trx.id} className="hover:bg-base-200/30">
                                                    <td className="font-mono font-bold text-base-content whitespace-nowrap">
                                                        {trx.transaction_code}
                                                        <div className="mt-0.5">
                                                            {trx.transaction_type === 'tool_borrow' ? (
                                                                <span className="badge badge-secondary badge-xs">Tool</span>
                                                            ) : (
                                                                <span className="badge badge-ghost badge-xs">Material</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-base-content/70 whitespace-nowrap">
                                                        {new Date(trx.created_at).toLocaleString('id-ID', {
                                                            dateStyle: 'medium',
                                                            timeStyle: 'short',
                                                        })}
                                                    </td>
                                                    <td>
                                                        <div className="font-bold text-base-content">
                                                            {trx.requester_name || trx.user?.name}
                                                        </div>
                                                        <div className="text-[11px] text-base-content/60">
                                                            {trx.requester_work_area?.name || 'Area Umum'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="space-y-0.5">
                                                            {trx.items?.map((tItem) => (
                                                                <div key={tItem.id} className="text-xs">
                                                                    <span className="font-mono font-bold text-primary mr-1">
                                                                        {tItem.quantity}x
                                                                    </span>
                                                                    <span className="text-base-content font-medium">
                                                                        {tItem.item?.item_name}
                                                                    </span>
                                                                    {tItem.item?.location?.name && (
                                                                        <span className="text-[10px] text-base-content/50 ml-1">
                                                                            ({tItem.item.location.name})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="align-middle text-center">
                                                        {getStatusBadge(trx.status)}
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center gap-1.5">
                                                            {trx.checkout_photo_url && (
                                                                <button
                                                                    onClick={() => setPreviewPhoto({
                                                                        title: `Foto Checkout: ${trx.transaction_code}`,
                                                                        url: trx.checkout_photo_url,
                                                                    })}
                                                                    className="w-9 h-9 rounded-md overflow-hidden border border-base-300 relative group"
                                                                    title="Foto Pengambilan"
                                                                >
                                                                    <img
                                                                        src={trx.checkout_photo_url}
                                                                        alt="Checkout"
                                                                        className="w-full h-full object-cover group-hover:scale-110 transition"
                                                                    />
                                                                </button>
                                                            )}
                                                            {trx.return_photo_url && (
                                                                <button
                                                                    onClick={() => setPreviewPhoto({
                                                                        title: `Foto Pengembalian: ${trx.transaction_code}`,
                                                                        url: trx.return_photo_url,
                                                                    })}
                                                                    className="w-9 h-9 rounded-md overflow-hidden border border-primary relative group"
                                                                    title="Foto Pengembalian"
                                                                >
                                                                    <img
                                                                        src={trx.return_photo_url}
                                                                        alt="Return"
                                                                        className="w-full h-full object-cover group-hover:scale-110 transition"
                                                                    />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="max-w-xs">
                                                        <p className="line-clamp-2 text-base-content/70">
                                                            {trx.purpose_notes}
                                                        </p>
                                                        {trx.rejection_reason && (
                                                            <p className="text-error font-medium text-[11px] mt-0.5">
                                                                Alasan Tolak: {trx.rejection_reason}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="text-center whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            {isUnreturnedTool(trx) && (
                                                                <button
                                                                    onClick={() => handleOpenReturn(trx)}
                                                                    className="btn btn-secondary btn-xs text-white font-semibold shadow-sm gap-1"
                                                                >
                                                                    <span>🔄</span>
                                                                    <span>Kembalikan</span>
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleOpenReturn(trx)}
                                                                className="btn btn-outline btn-xs font-semibold"
                                                            >
                                                                Edit
                                                            </button>
                                                            {user?.role === 'tkno_admin' && (
                                                                <button
                                                                    onClick={() => handleDeleteTransaction(trx)}
                                                                    className="btn btn-error btn-xs text-white font-semibold"
                                                                    title="Hapus Transaksi"
                                                                >
                                                                    🗑️ Hapus
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Auto Load on Scroll */}
                                <div ref={loadMoreHistoryRef} className="flex justify-center py-4 border-t border-base-200">
                                    {isLoadingMoreHistory ? (
                                        <span className="text-xs text-base-content/60 flex items-center gap-2">
                                            <span className="loading loading-spinner loading-xs"></span>
                                            Memuat transaksi lainnya...
                                        </span>
                                    ) : nextHistoryUrl ? (
                                        <span className="text-[11px] text-base-content/40">
                                            Scroll ke bawah untuk memuat lebih banyak
                                        </span>
                                    ) : (
                                        <span className="text-[11px] text-base-content/40">
                                            Semua transaksi telah ditampilkan ({allHistory.length})
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="p-12 text-center text-base-content/50">
                                <span className="text-4xl block mb-2">📜</span>
                                <h4 className="font-bold text-sm">Belum ada riwayat transaksi</h4>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <ReturnModal
                isOpen={isReturnModalOpen}
                transaction={selectedReturnTrx}
                availableItems={availableItems}
                requesterNames={requesterNames}
                onClose={() => {
                    setIsReturnModalOpen(false);
                    setSelectedReturnTrx(null);
                }}
            />

            <RejectModal
                isOpen={isRejectModalOpen}
                transaction={selectedRejectTrx}
                onClose={() => {
                    setIsRejectModalOpen(false);
                    setSelectedRejectTrx(null);
                }}
            />

            {/* Photo High-Res Modal */}
            {previewPhoto && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl bg-base-100 p-4 relative">
                        <button
                            onClick={() => setPreviewPhoto(null)}
                            className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 text-base-content/70"
                        >
                            ✕
                        </button>
                        <h4 className="font-bold text-sm text-base-content mb-3">{previewPhoto.title}</h4>
                        <div className="w-full h-96 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                            <img src={previewPhoto.url} alt="Bukti" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <div className="modal-backdrop bg-black/60" onClick={() => setPreviewPhoto(null)}></div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
