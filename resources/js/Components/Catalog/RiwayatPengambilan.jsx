import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const sampleHistory = [
    {
        id: 1,
        waktu: "24 Nov 2026, 22:15",
        pemohon: "Budi Santoso",
        qty: 1,
        buktiFoto: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&auto=format&fit=crop",
    },
    {
        id: 2,
        waktu: "24 Nov 2026, 16:40",
        pemohon: "Siti Rahmawati",
        qty: 1,
        buktiFoto: "https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=400&auto=format&fit=crop",
    },
    {
        id: 3,
        waktu: "23 Nov 2026, 09:20",
        pemohon: "Andi Wijaya",
        qty: 1,
        buktiFoto: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&auto=format&fit=crop",
    },
    {
        id: 4,
        waktu: "22 Nov 2026, 14:05",
        pemohon: "Rina Kusuma",
        qty: 1,
        buktiFoto: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&auto=format&fit=crop",
    },
];

export default function RiwayatPengambilan({ history = sampleHistory }) {
    const [showAll, setShowAll] = useState(false);

    const sortedHistory = [...history].sort((a, b) => b.id - a.id);
    const displayedHistory = showAll ? sortedHistory : sortedHistory.slice(0, 1);

    return (
        <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                    History Pengambilan {showAll ? `(${sortedHistory.length})` : "(Terakhir)"}
                </h3>
                {sortedHistory.length > 1 && (
                    <button
                        type="button"
                        onClick={() => setShowAll((prev) => !prev)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        {showAll ? "Tampilkan Terakhir Saja" : "Lihat Semua (Scroll)"}
                    </button>
                )}
            </div>

            <div
                className={`relative rounded-lg border border-slate-100 ${showAll ? "max-h-56 overflow-y-auto" : "overflow-visible"
                    }`}
            >
                <table className="w-full border-collapse text-left text-sm">
                    <tbody className="divide-y divide-slate-100">
                        {displayedHistory.length === 0 ? (
                            <tr>
                                <td className="p-3 text-center text-xs text-slate-400">
                                    Belum ada riwayat pengambilan
                                </td>
                            </tr>
                        ) : (
                            displayedHistory.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/70">
                                    <td className="p-2.5 text-slate-700">
                                        <ClickFotoTrigger
                                            label={`${item.waktu} - ${item.pemohon} - ${item.qty}x`}
                                            fotoUrl={item.buktiFoto}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ClickFotoTrigger({ label, fotoUrl }) {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);

    const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
            top: rect.top - 8,
            left: rect.left + rect.width / 2,
        });
    };

    const handleToggle = () => {
        if (!isOpen) {
            updatePosition();
        }
        setIsOpen((prev) => !prev);
    };

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event) => {
            const clickedTrigger = triggerRef.current?.contains(event.target);
            const clickedPopover = popoverRef.current?.contains(event.target);
            if (!clickedTrigger && !clickedPopover) {
                setIsOpen(false);
            }
        };

        const handleReposition = () => updatePosition();

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", handleReposition, true);
        window.addEventListener("resize", handleReposition);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleReposition, true);
            window.removeEventListener("resize", handleReposition);
        };
    }, [isOpen]);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={handleToggle}
                className={`cursor-pointer border-b border-dashed text-left transition-colors ${isOpen
                        ? "border-blue-600 font-medium text-blue-600"
                        : "border-slate-400 hover:border-blue-600 hover:text-blue-600"
                    }`}
            >
                {label}
            </button>

            {isOpen &&
                createPortal(
                    <div
                        ref={popoverRef}
                        style={{
                            top: `${coords.top}px`,
                            left: `${coords.left}px`,
                        }}
                        className="fixed z-[9999] w-48 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white p-2 shadow-xl"
                    >
                        <div className="mb-1 flex items-center justify-between">
                            <span className="text-[11px] font-medium text-slate-600">
                                Bukti Foto
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="rounded px-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                title="Tutup"
                            >
                                ✕
                            </button>
                        </div>
                        <img
                            src={fotoUrl}
                            alt={`Bukti foto - ${label}`}
                            className="h-32 w-full rounded object-cover"
                        />
                    </div>,
                    document.body
                )}
        </>
    );
}