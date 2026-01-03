import React from 'react';
import { BenchmarkMetrics } from '../../utils/benchmarkUtils';
import { ColumnConfig } from '../../utils/columnConfig';

interface BenchmarkRowProps {
    benchmark: BenchmarkMetrics;
    columns: ColumnConfig[];
    level: 'Campaign' | 'AdSet' | 'Ad';
    parentName?: string; // For AdSet/Ad, show which Campaign/AdSet they belong to
    indent?: boolean;
    indentMore?: boolean;
}

const levelConfig = {
    Campaign: {
        gradient: 'from-indigo-600 to-purple-600',
        bgLight: 'bg-indigo-50',
        borderColor: 'border-indigo-700',
        textColor: 'text-indigo-900',
        lightText: 'text-indigo-100',
        icon: '📊',
        label: 'Campaign Benchmark',
        description: 'Average metrics across all campaigns'
    },
    AdSet: {
        gradient: 'from-blue-500 to-cyan-500',
        bgLight: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-900',
        lightText: 'text-blue-100',
        icon: '📊',
        label: 'AdSet Benchmark',
        description: 'Average for AdSets'
    },
    Ad: {
        gradient: 'from-teal-500 to-green-500',
        bgLight: 'bg-teal-50',
        borderColor: 'border-teal-200',
        textColor: 'text-teal-900',
        lightText: 'text-teal-100',
        icon: '📊',
        label: 'Ad Benchmark',
        description: 'Average for Ads'
    }
};

export const BenchmarkRow: React.FC<BenchmarkRowProps> = ({
    benchmark,
    columns,
    level,
    parentName,
    indent,
    indentMore
}) => {
    const config = levelConfig[level];
    const paddingLeft = indentMore ? '6rem' : indent ? '3rem' : '1.5rem';

    return (
        <>
            {/* Title Row - Same background as data row */}
            <tr className={`${config.bgLight} ${level === 'Campaign' ? 'sticky top-0 z-10 border-b-4' : 'border-b-2'} ${config.borderColor}`}>
                <td
                    colSpan={columns.length + 3}
                    className="px-6 py-3"
                    style={{ paddingLeft }}
                >
                    <div className="flex items-center gap-3">
                        <span className={level === 'Campaign' ? 'text-2xl' : level === 'AdSet' ? 'text-xl' : 'text-lg'}>
                            {config.icon}
                        </span>
                        <div>
                            <div className={`font-black ${config.textColor} ${level === 'Campaign' ? 'text-base' : level === 'AdSet' ? 'text-sm' : 'text-xs'}`}>
                                {config.label}
                            </div>
                            <div className={`text-slate-600 mt-0.5 ${level === 'Campaign' ? 'text-[10px]' : 'text-[9px]'}`}>
                                {parentName
                                    ? `${config.description} in "${parentName}"`
                                    : config.description
                                }
                            </div>
                        </div>
                    </div>
                </td>
            </tr>

            {/* Data Row - Always Visible */}
            <tr className={`${config.bgLight} border-b-2 ${config.borderColor}`}>
                <td
                    className={`px-6 py-2 text-xs font-bold ${config.textColor}`}
                    style={{ paddingLeft }}
                >
                    Average
                </td>
                {columns.map(col => (
                    <td key={col.key} className={`px-4 py-2 text-sm font-bold ${config.textColor} whitespace-nowrap`}>
                        {col.format(benchmark[col.key as keyof BenchmarkMetrics] || 0)}
                    </td>
                ))}
                <td className="px-4 py-2 text-slate-400 text-center text-xs">-</td>
                <td className="px-4 py-2 text-slate-400 text-center text-xs">-</td>
            </tr>
        </>
    );
};
