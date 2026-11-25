import React, { useState, useRef, useEffect } from 'react';

const CreatableSelect = ({
    options = [],
    value,
    onChange,
    onCreateOption,
    placeholder = 'Pilih atau ketik data baru...',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // Tutup dropdown jika klik di luar komponen
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter opsi berdasarkan input pencarian
    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Cek apakah input persis sama dengan salah satu opsi yang sudah ada
    const isExactMatch = options.some(
        (option) => option.label.toLowerCase() === searchTerm.trim().toLowerCase()
    );

    // Handler saat memilih opsi yang sudah ada
    const handleSelect = (option) => {
        onChange(option);
        setSearchTerm('');
        setIsOpen(false);
    };

    // Handler saat membuat opsi baru
    const handleCreate = () => {
        const trimmed = searchTerm.trim();
        if (!trimmed) return;

        const newOption = {
            value: trimmed.toLowerCase().replace(/\s+/g, '-'),
            label: trimmed,
        };

        if (onCreateOption) {
            onCreateOption(newOption);
        }
        onChange(newOption);
        setSearchTerm('');
        setIsOpen(false);
    };

    // Handler tekan Enter untuk langsung tambah jika data tidak ada
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredOptions.length === 1) {
                handleSelect(filteredOptions[0]);
            } else if (searchTerm.trim() && !isExactMatch) {
                handleCreate();
            }
        }
    };

    return (
        <div className="relative w-full max-w-sm" ref={dropdownRef}>
            {/* Input / Trigger Box */}
            <div
                onClick={() => setIsOpen(true)}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm bg-white border rounded-lg cursor-text transition-all ${isOpen
                    ? 'border-blue-500 ring-2 ring-blue-100'
                    : 'border-gray-300 hover:border-gray-400'
                    }`}
            >
                <input
                    type="text"
                    className="w-full bg-transparent outline-none text-gray-800 placeholder-gray-400"
                    placeholder={value ? value.label : placeholder}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                />

                {/* Tombol Clear & Icon Panah */}
                <div className="flex items-center gap-1.5 ml-2 text-gray-400">
                    {value && !searchTerm && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(null);
                            }}
                            className="hover:text-gray-600 focus:outline-none"
                            title="Hapus pilihan"
                        >
                            ✕
                        </button>
                    )}
                    <svg
                        className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                            }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <ul className="absolute z-10 w-full mt-1.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto py-1 text-sm">
                    {/* Daftar Opsi yang Cocok */}
                    {filteredOptions.map((option) => {
                        const isSelected = value?.value === option.value;
                        return (
                            <li
                                key={option.value}
                                onClick={() => handleSelect(option)}
                                className={`px-3 py-2 cursor-pointer flex items-center justify-between ${isSelected
                                    ? 'bg-blue-50 text-blue-600 font-medium'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <span>{option.label}</span>
                                {isSelected && <span>✓</span>}
                            </li>
                        );
                    })}

                    {/* Opsi Tambah Data Baru (Muncul jika ketikan belum ada di list) */}
                    {searchTerm.trim() !== '' && !isExactMatch && (
                        <li
                            onClick={handleCreate}
                            className="px-3 py-2 cursor-pointer text-blue-600 hover:bg-blue-50 font-medium flex items-center gap-2 border-t border-gray-100"
                        >
                            <span className="flex items-center justify-center w-5 h-5 text-xs bg-blue-100 text-blue-600 rounded-full">
                                +
                            </span>
                            <span>Tambah &quot;{searchTerm.trim()}&quot;</span>
                        </li>
                    )}

                    {/* State Kosong */}
                    {filteredOptions.length === 0 && searchTerm.trim() === '' && (
                        <li className="px-3 py-2 text-gray-400 text-center">
                            Tidak ada data
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default CreatableSelect;