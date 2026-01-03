import React from 'react';

interface LevelToggleProps {
    levels: string[];
    selected: string;
    onChange: (level: string) => void;
}

export const LevelToggle: React.FC<LevelToggleProps> = ({ levels, selected, onChange }) => {
    return (
        <div className="flex items-center gap-2">
            {levels.map((level) => (
                <button
                    key={level}
                    onClick={() => onChange(level)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${selected === level
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                            : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                        }`}
                >
                    {level}
                </button>
            ))}
        </div>
    );
};
