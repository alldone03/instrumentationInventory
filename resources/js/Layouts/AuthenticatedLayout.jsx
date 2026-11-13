import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function AuthenticatedLayout({ header, children, cartCount = 0, onOpenCart }) {
    const { auth, flash } = usePage().props;
    const user = auth.user;

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const getRoleBadge = (role) => {
        switch (role) {
            case 'tkno_admin':
                return <span className="badge badge-error badge-sm text-white font-semibold">Super Admin (TKNO Admin)</span>;
            case 'tko':
                return <span className="badge badge-primary badge-sm text-white font-semibold">TKO (Supervisor)</span>;
            case 'tkno':
            default:
                return <span className="badge badge-neutral badge-sm font-semibold">TKNO (Teknisi)</span>;
        }
    };

    const isCurrent = (name) => route().current(name);

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800" data-theme="light">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar (Desktop fixed & Mobile drawer) */}
            <aside
                className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div>
                    {/* Brand / Logo */}
                    <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200">
                        <Link href={route('items.index')} className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-blue-500/30">
                                ⚡
                            </div>
                            <div className="leading-tight">
                                <span className="font-extrabold text-sm tracking-tight text-slate-900 block">
                                    INSTRUMENT
                                </span>
                                <span className="text-[10px] tracking-wider uppercase text-slate-500 font-semibold block">
                                    Workshop & Warehouse
                                </span>
                            </div>
                        </Link>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="lg:hidden btn btn-sm btn-ghost btn-circle text-slate-400"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Work Area & User Badge in Sidebar */}
                    <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Area Operasional
                        </div>
                        <div className="font-bold text-xs text-slate-700 truncate">
                            📍 {user?.work_area?.name || 'Seluruh Area Workshop'}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                            {getRoleBadge(user?.role)}
                        </div>
                    </div>

                    {/* Navigation Menu */}
                    <nav className="p-3 space-y-1">
                        <Link
                            href={route('items.index')}
                            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
                                isCurrent('items.index')
                                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                            <span className="text-base">📦</span>
                            <span>Katalog & Gudang</span>
                        </Link>

                        <Link
                            href={route('transactions.index')}
                            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
                                isCurrent('transactions.index')
                                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                            <span className="text-base">📝</span>
                            <span>Approval & Transaksi</span>
                        </Link>

                        <a
                            href={route('items.export-sap')}
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                            <span className="text-base">📊</span>
                            <span>Export SAP (CSV)</span>
                        </a>

                        {onOpenCart && (
                            <button
                                type="button"
                                onClick={onOpenCart}
                                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-base">🛒</span>
                                    <span>Keranjang Saya</span>
                                </div>
                                {cartCount > 0 && (
                                    <span className="badge badge-primary badge-sm font-bold text-white">
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </nav>
                </div>

                {/* Bottom User Info & Logout */}
                <div className="p-3 border-t border-slate-200 bg-white">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-xs text-slate-800 truncate">{user?.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">
                                    {user?.badge_number ? `NIK: ${user.badge_number}` : user?.email}
                                </div>
                            </div>
                        </div>

                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            title="Log Out"
                            className="btn btn-ghost btn-xs btn-circle text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden btn btn-sm btn-ghost btn-square text-slate-600"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        <div className="hidden sm:block">
                            <span className="text-xs text-slate-400 font-medium">Workshop Management System</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Area pill */}
                        <div className="hidden md:flex items-center gap-2">
                            <span className="badge badge-outline badge-sm text-xs border-slate-300 font-medium text-slate-600">
                                📍 {user?.work_area?.name || 'All Areas'}
                            </span>
                            {getRoleBadge(user?.role)}
                        </div>

                        {/* Cart Shortcut in Topbar */}
                        {onOpenCart && (
                            <button
                                onClick={onOpenCart}
                                className="btn btn-sm btn-ghost gap-2 text-slate-700 hover:bg-slate-100 relative"
                            >
                                <span className="text-base">🛒</span>
                                <span className="hidden sm:inline text-xs font-semibold">Keranjang</span>
                                {cartCount > 0 && (
                                    <span className="badge badge-primary badge-sm font-bold text-white">
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                        )}

                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
                                    >
                                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                            {user?.name?.charAt(0) || 'U'}
                                        </div>
                                        <span className="hidden sm:block text-xs font-medium text-slate-700 max-w-[120px] truncate">
                                            {user?.name}
                                        </span>
                                    </button>
                                </Dropdown.Trigger>

                                <Dropdown.Content>
                                    <div className="px-4 py-2 border-b border-slate-100 text-xs text-slate-600">
                                        <div className="font-semibold text-slate-800">{user?.name}</div>
                                        <div className="text-slate-400 text-[11px] truncate">{user?.email}</div>
                                    </div>
                                    <Dropdown.Link href={route('profile.edit')}>
                                        Profil Saya
                                    </Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button">
                                        Keluar (Log Out)
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </header>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 mt-4">
                        <div className="alert alert-success shadow-sm flex items-center justify-between text-xs py-3 text-white rounded-xl">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{flash.success}</span>
                            </div>
                        </div>
                    </div>
                )}

                {flash?.error && (
                    <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 mt-4">
                        <div className="alert alert-error shadow-sm flex items-center justify-between text-xs py-3 text-white rounded-xl">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>{flash.error}</span>
                            </div>
                        </div>
                    </div>
                )}

                {header && (
                    <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-4">
                        {header}
                    </div>
                )}

                {/* Page Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    {children}
                </main>

                <footer className="py-4 px-6 bg-white border-t border-slate-200 text-center text-xs text-slate-400">
                    Industrial Warehouse & Sparepart Management System • Instrument & Electrical Workshop
                </footer>
            </div>
        </div>
    );
}
