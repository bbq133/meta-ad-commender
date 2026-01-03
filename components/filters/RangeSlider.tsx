import React from 'react';

interface RangeSliderProps {
    min: number;
    max: number;
    value: [number, number];
    onChange: (value: [number, number]) => void;
    label: string;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({ min, max, value, onChange, label }) => {
    const [minVal, maxVal] = value;

    const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newMin = Math.min(Number(e.target.value), maxVal);
        onChange([newMin, maxVal]);
    };

    const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newMax = Math.max(Number(e.target.value), minVal);
        onChange([minVal, newMax]);
    };

    return (
        <div className="flex flex-col gap-2 min-w-[200px]">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{label}:</span>
                <span className="text-sm font-bold text-indigo-600">{minVal}-{maxVal}天</span>
            </div>
            <div className="relative pt-2">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={minVal}
                    onChange={handleMinChange}
                    className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none z-10"
                    style={{
                        WebkitAppearance: 'none',
                    }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={maxVal}
                    onChange={handleMaxChange}
                    className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none z-10"
                    style={{
                        WebkitAppearance: 'none',
                    }}
                />
                <div className="relative w-full h-2 bg-slate-200 rounded-full">
                    <div
                        className="absolute h-2 bg-indigo-600 rounded-full"
                        style={{
                            left: `${((minVal - min) / (max - min)) * 100}%`,
                            right: `${100 - ((maxVal - min) / (max - min)) * 100}%`,
                        }}
                    />
                </div>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
                <span>{min}天</span>
                <span>{max}天</span>
            </div>
            <style jsx>{`
                input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #4f46e5;
                    cursor: pointer;
                    pointer-events: all;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                input[type="range"]::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #4f46e5;
                    cursor: pointer;
                    pointer-events: all;
                    border: none;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
            `}</style>
        </div>
    );
};
