
import React, { useState } from "react";

const sampleHistory = [
    {
        id: 1,
        waktu: "24 Nov 2026, 22:15",
        pemohon: "Budi Santoso",
        buktiFoto: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&auto=format&fit=crop",
    },
    {
        id: 2,
        waktu: "24 Nov 2026, 16:40",
        pemohon: "Siti Rahmawati",
        buktiFoto: "https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=400&auto=format&fit=crop",
    },
    {
        id: 3,
        waktu: "23 Nov 2026, 09:20",
        pemohon: "Andi Wijaya",
        buktiFoto: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&auto=format&fit=crop",
    },
    {
        id: 4,
        waktu: "22 Nov 2026, 14:05",
        pemohon: "Rina Kusuma",
        buktiFoto: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&auto=format&fit=crop",
    },
];

export default function RiwayatPengambilan({ history = sampleHistory }) {
    const [showAll, setShowAll] = useState(false);

    // Urutkan dari paling baru (terakhir) ke terlama
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

            {/* Container dengan scroll saat showAll aktif */}
            <div
                className={`relative rounded-lg border border-slate-100 ${showAll ? "max-h-56 overflow-y-auto" : "overflow-visible"
                    }`}
            >
                <table className="w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-600">
                        <tr>
                            <th className="px-3 py-2 font-semibold">Waktu</th>

                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {displayedHistory.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/70">
                                <td className="text-slate-700">
                                    <HoverFotoTrigger label={`${item.waktu} - ${item.pemohon}`} fotoUrl={item.buktiFoto} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function HoverFotoTrigger({ label, fotoUrl }) {
    return (
        <span className="group relative inline-block cursor-pointer border-b border-dashed border-slate-400 hover:border-blue-600 hover:text-blue-600">
            {label}

            {/* Popover Bukti Foto saat di-hover */}
            <span className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-44 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-1.5 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
                <img
                    src={fotoUrl}
                    alt={`Bukti foto - ${label}`}
                    className="h-28 w-full rounded object-cover"
                />
                <span className="mt-1 block text-center text-[11px] font-normal text-slate-500">
                    Bukti Foto
                </span>
            </span>
        </span>
    );
}

