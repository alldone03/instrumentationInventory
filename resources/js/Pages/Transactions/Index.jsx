import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReturnToolModal from '@/Components/Transactions/ReturnToolModal';
import RejectModal from '@/Components/Transactions/RejectModal';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ pendingTransactions = [], borrowedTransactions = [], historyTransactions = { data: [] } }) {
    const { auth } = usePage().props;
    const user = auth.user;

    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'borrowed', 'history'

    const [selectedReturnTrx, setSelectedReturnTrx] = useState(null);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

    const [selectedRejectTrx, setSelectedRejectTrx] = useState(null);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    const [previewPhoto, setPreviewPhoto] = useState(null);

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
                return <span className="badge badge-warning text-xs font-semibold">Menunggu Approval</span>;
            case 'borrowed':
                return <span className="badge badge-info text-white text-xs font-semibold">Sedang Dipinjam</span>;
            case 'completed':
                return <span className="badge badge-success text-white text-xs font-semibold">Selesai (Material)</span>;
            case 'returned':
                return <span className="badge badge-primary text-white text-xs font-semibold">Dikembalikan</span>;
            case 'rejected':
                return <span className="badge badge-error text-white text-xs font-semibold">Ditolak</span>;
            default:
                return <span className="badge badge-ghost text-xs">{status}</span>;
        }
    };

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
                            Verifikasi otorisasi pengambilan material lintas-area, pemantauan pengembalian alat kerja, dan riwayat audit.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {user?.work_area && (
                            <span className="badge badge-outline text-xs py-3 px-3">
                                📍 Area Kerja Anda: <b className="ml-1 text-primary">{user.work_area.name}</b>
                            </span>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs tabs-boxed bg-base-100 p-1.5 rounded-xl border border-base-300 shadow-sm flex flex-wrap gap-1">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`tab flex-1 font-bold text-xs py-3 transition ${
                            activeTab === 'pending' ? 'tab-active !bg-warning !text-neutral-900 shadow-sm' : ''
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
                        onClick={() => setActiveTab('borrowed')}
                        className={`tab flex-1 font-bold text-xs py-3 transition ${
                            activeTab === 'borrowed' ? 'tab-active !bg-info !text-white shadow-sm' : ''
                        }`}
                    >
                        🔧 Alat Sedang Dipinjam
                        {borrowedTransactions.length > 0 && (
                            <span className="badge badge-neutral text-white badge-xs ml-2 font-mono">
                                {borrowedTransactions.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`tab flex-1 font-bold text-xs py-3 transition ${
                            activeTab === 'history' ? 'tab-active !bg-primary !text-white shadow-sm' : ''
                        }`}
                    >
                        📜 Riwayat Transaksi ({historyTransactions.total || historyTransactions.data.length})
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
                                            <th>No. Transaksi</th>
                                            <th>Tanggal</th>
                                            <th>Pemohon & Area</th>
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
                                                    <div className="font-bold text-base-content">{trx.user?.name}</div>
                                                    <div className="text-[11px] text-base-content/60">
                                                        {trx.requester_work_area?.name || 'Area Umum'}
                                                    </div>
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

                {/* TAB 2: ACTIVE BORROWED TOOLS */}
                {activeTab === 'borrowed' && (
                    <div className="bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-base-200 bg-base-200/40 flex items-center justify-between">
                            <span className="text-xs font-bold text-base-content">
                                Daftar Alat Kerja (Tools) yang Saat Ini Sedang Berada di Lapangan
                            </span>
                            <span className="text-xs text-base-content/60">
                                {borrowedTransactions.length} Transaksi Peminjaman
                            </span>
                        </div>

                        {borrowedTransactions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="table table-sm text-xs">
                                    <thead>
                                        <tr className="bg-base-200/50 text-base-content/70">
                                            <th>No. Transaksi</th>
                                            <th>Waktu Pinjam</th>
                                            <th>Peminjam</th>
                                            <th>Alat yang Dipinjam</th>
                                            <th>Keperluan / Tag No</th>
                                            <th>Bukti Pinjam</th>
                                            <th className="text-center">Aksi Pengembalian</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {borrowedTransactions.map((trx) => (
                                            <tr key={trx.id} className="hover:bg-base-200/30">
                                                <td className="font-mono font-bold text-secondary">
                                                    {trx.transaction_code}
                                                </td>
                                                <td className="text-base-content/70 whitespace-nowrap">
                                                    {new Date(trx.created_at).toLocaleString('id-ID', {
                                                        dateStyle: 'medium',
                                                        timeStyle: 'short',
                                                    })}
                                                </td>
                                                <td>
                                                    <div className="font-bold text-base-content">{trx.user?.name}</div>
                                                    <div className="text-[11px] text-base-content/60">
                                                        {trx.requester_work_area?.name || 'Area Umum'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="space-y-1">
                                                        {trx.items?.map((tItem) => (
                                                            <div key={tItem.id} className="flex items-center gap-1.5">
                                                                <span className="font-mono font-bold text-secondary">
                                                                    {tItem.quantity} {tItem.item?.unit || 'unit'}
                                                                </span>
                                                                <span className="font-medium text-base-content">
                                                                    {tItem.item?.item_name}
                                                                </span>
                                                                <span className="text-[10px] text-base-content/50">
                                                                    (Lokasi Rak: {tItem.item?.location?.name || '-'})
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
                                                                title: `Bukti Peminjaman: ${trx.transaction_code}`,
                                                                url: trx.checkout_photo_url,
                                                            })}
                                                            className="w-12 h-12 rounded-lg overflow-hidden border border-base-300 relative group"
                                                        >
                                                            <img
                                                                src={trx.checkout_photo_url}
                                                                alt="Bukti Pinjam"
                                                                className="w-full h-full object-cover group-hover:scale-110 transition"
                                                            />
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <button
                                                        onClick={() => handleOpenReturn(trx)}
                                                        className="btn btn-secondary btn-sm text-white font-semibold shadow-sm gap-1"
                                                    >
                                                        <span>🔄</span>
                                                        <span>Kembalikan Alat</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-base-content/50">
                                <span className="text-4xl block mb-2">🔧</span>
                                <h4 className="font-bold text-sm">Tidak ada alat yang sedang dipinjam</h4>
                                <p className="text-xs text-base-content/60 mt-1">
                                    Seluruh toolkit dan alat ukur instrumen tersimpan lengkap di rak workshop.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: TRANSACTION HISTORY LOG */}
                {activeTab === 'history' && (
                    <div className="bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-base-200 bg-base-200/40 flex items-center justify-between">
                            <span className="text-xs font-bold text-base-content">
                                Log Audit Transaksi Pengambilan & Pengembalian
                            </span>
                            <span className="text-xs text-base-content/60">
                                Menampilkan riwayat transaksi terkini
                            </span>
                        </div>

                        {historyTransactions.data && historyTransactions.data.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="table table-sm text-xs">
                                    <thead>
                                        <tr className="bg-base-200/50 text-base-content/70">
                                            <th>No. Transaksi</th>
                                            <th>Waktu</th>
                                            <th>Pemohon</th>
                                            <th>Barang</th>
                                            <th>Status</th>
                                            <th>Otorisasi</th>
                                            <th>Bukti Foto</th>
                                            <th>Catatan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyTransactions.data.map((trx) => (
                                            <tr key={trx.id} className="hover:bg-base-200/30">
                                                <td className="font-mono font-bold text-base-content">
                                                    {trx.transaction_code}
                                                </td>
                                                <td className="text-base-content/70 whitespace-nowrap">
                                                    {new Date(trx.created_at).toLocaleString('id-ID', {
                                                        dateStyle: 'medium',
                                                        timeStyle: 'short',
                                                    })}
                                                </td>
                                                <td>
                                                    <div className="font-bold text-base-content">{trx.user?.name}</div>
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
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td>
                                                    {getStatusBadge(trx.status)}
                                                </td>
                                                <td>
                                                    {trx.approver ? (
                                                        <div>
                                                            <span className="font-medium text-base-content block">
                                                                {trx.approver.name}
                                                            </span>
                                                            <span className="text-[10px] text-base-content/50">
                                                                {trx.approved_at && new Date(trx.approved_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-base-content/40 italic">-</span>
                                                    )}
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
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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
            <ReturnToolModal
                isOpen={isReturnModalOpen}
                transaction={selectedReturnTrx}
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

