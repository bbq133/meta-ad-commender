import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface MultiSelectProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    label: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(s => s !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const toggleAll = () => {
        if (selected.length === options.length) {
            onChange([]);
        } else {
            onChange([...options]);
        }
    };

    const allSelected = selected.length === options.length;

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
                {label} ({selected.length}/{options.length})
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                    <div className="p-2">
                        <button
                            onClick={toggleAll}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded text-sm font-medium text-slate-700 transition-colors"
                        >
                            <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${allSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                                }`}>
                                {allSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            全选
                        </button>
                        <div className="border-t border-slate-200 my-2"></div>
                        {options.map((option) => {
                            const isSelected = selected.includes(option);
                            return (
                                <button
                                    key={option}
                                    onClick={() => toggleOption(option)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded text-sm text-slate-700 transition-colors"
                                >
                                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                                        }`}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
