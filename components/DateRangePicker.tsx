import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectingStart, setSelectingStart] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 关闭下拉框当点击外部
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const formatDisplayDate = (date: string) => {
        if (!date) return '';
        const d = new Date(date + 'T00:00:00');
        return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    const formatDateToString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const setQuickRange = (days: number) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const end = new Date(today);
        end.setDate(end.getDate() - 1);

        const start = new Date(end);
        start.setDate(start.getDate() - days + 1);

        onStartDateChange(formatDateToString(start));
        onEndDateChange(formatDateToString(end));
        setIsOpen(false);
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (Date | null)[] = [];

        // 添加前面的空白
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // 添加当月的日期
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const handleDateClick = (date: Date) => {
        const dateStr = formatDateToString(date);

        if (selectingStart) {
            onStartDateChange(dateStr);
            setSelectingStart(false);
        } else {
            // 确保结束日期不早于开始日期
            if (startDate && dateStr < startDate) {
                onStartDateChange(dateStr);
                onEndDateChange(startDate);
            } else {
                onEndDateChange(dateStr);
            }
            setSelectingStart(true);
            setIsOpen(false);
        }
    };

    const isDateInRange = (date: Date) => {
        if (!startDate || !endDate) return false;
        const dateStr = formatDateToString(date);
        return dateStr >= startDate && dateStr <= endDate;
    };

    const isDateSelected = (date: Date) => {
        const dateStr = formatDateToString(date);
        return dateStr === startDate || dateStr === endDate;
    };

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const days = getDaysInMonth(currentMonth);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* 触发按钮 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:border-indigo-400 transition-colors text-sm"
            >
                <Calendar className="w-4 h-4 text-slate-600" />
                <span className="text-slate-700">
                    {startDate && endDate
                        ? `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
                        : '选择日期范围'}
                </span>
            </button>

            {/* 下拉面板 */}
            {isOpen && (
                <div className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 min-w-[600px]">
                    <div className="flex gap-4">
                        {/* 左侧：快捷选项 */}
                        <div className="flex flex-col gap-2 border-r border-slate-200 pr-4">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                快捷选择
                            </div>
                            {[
                                { label: '昨天', days: 1 },
                                { label: '近3天', days: 3 },
                                { label: '近7天', days: 7 },
                                { label: '近14天', days: 14 },
                                { label: '近30天', days: 30 }
                            ].map(option => (
                                <button
                                    key={option.days}
                                    onClick={() => setQuickRange(option.days)}
                                    className="px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors whitespace-nowrap"
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>

                        {/* 右侧：日历 */}
                        <div className="flex-1">
                            {/* 提示信息 */}
                            <div className="mb-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                                {selectingStart ? (
                                    <span>📅 请选择<strong className="text-indigo-600">开始日期</strong></span>
                                ) : (
                                    <span>📅 请选择<strong className="text-indigo-600">结束日期</strong></span>
                                )}
                            </div>

                            {/* 月份导航 */}
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    onClick={previousMonth}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                                </button>
                                <div className="text-base font-bold text-slate-900">
                                    {currentMonth.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
                                </div>
                                <button
                                    onClick={nextMonth}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 text-slate-600" />
                                </button>
                            </div>

                            {/* 星期标题 */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                                    <div key={day} className="text-center text-xs font-bold text-slate-500 py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* 日期网格 */}
                            <div className="grid grid-cols-7 gap-1">
                                {days.map((date, index) => {
                                    if (!date) {
                                        return <div key={`empty-${index}`} className="aspect-square" />;
                                    }

                                    const isInRange = isDateInRange(date);
                                    const isSelected = isDateSelected(date);
                                    const isToday = formatDateToString(date) === formatDateToString(new Date());

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleDateClick(date)}
                                            className={`
                                                aspect-square flex items-center justify-center text-sm rounded-lg transition-all
                                                ${isSelected
                                                    ? 'bg-indigo-600 text-white font-bold shadow-lg'
                                                    : isInRange
                                                        ? 'bg-indigo-100 text-indigo-700'
                                                        : 'hover:bg-slate-100 text-slate-700'
                                                }
                                                ${isToday && !isSelected ? 'ring-2 ring-indigo-400' : ''}
                                            `}
                                        >
                                            {date.getDate()}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* 底部操作 */}
                            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                                <div className="text-xs text-slate-500">
                                    {startDate && endDate && (
                                        <span>
                                            已选择: {formatDisplayDate(startDate)} 至 {formatDisplayDate(endDate)}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                                >
                                    确定
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
