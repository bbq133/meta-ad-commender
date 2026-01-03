import React, { useState, useMemo } from 'react';
import { RawAdRecord } from '../../types';
import { filterNewAudience } from '../../utils/newAudienceUtils';
import { KPIType } from '../../utils/newAudienceColumnConfig';
import { SummaryCards } from '../new-audience/SummaryCards';
import { NewAudienceTable } from '../new-audience/NewAudienceTable';
import { LevelToggle } from '../filters/LevelToggle';
import { SearchInput } from '../filters/SearchInput';
import { RangeSlider } from '../filters/RangeSlider';

interface NewAudienceTabProps {
    data: RawAdRecord[];
    comparisonData: RawAdRecord[];
    endDate: string;
    configs: any[]; // AdConfiguration[]
    onCampaignClick: (campaignName: string) => void;
    onTodoToggle: (item: any) => void;
    markedTodos: Set<string>;
}

export const NewAudienceTab: React.FC<NewAudienceTabProps> = ({
    data,
    comparisonData,
    endDate,
    configs,
    onCampaignClick,
    onTodoToggle,
    markedTodos
}) => {
    const [selectedKPI, setSelectedKPI] = useState<KPIType>('ROI');
    const [durationRange, setDurationRange] = useState<[number, number]>([1, 7]);
    const [filterLevel, setFilterLevel] = useState<'AdSet' | 'Ad'>('AdSet');
    const [searchText, setSearchText] = useState('');

    // Filter new audience ad sets based on selected KPI
    const newAdSets = useMemo(() => {
        try {
            console.log('NewAudienceTab - data length:', data.length);
            console.log('NewAudienceTab - endDate:', endDate);
            console.log('NewAudienceTab - selectedKPI:', selectedKPI);
            const result = filterNewAudience(data, endDate, configs, selectedKPI);
            console.log('NewAudienceTab - filtered ad sets:', result.length);
            return result;
        } catch (error) {
            console.error('Error filtering new audience:', error);
            return [];
        }
    }, [data, endDate, configs, selectedKPI]);

    return (
        <div className="space-y-6">
            {/* KPI Selector */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3">
                    <LevelToggle
                        levels={['ROI', 'CPC', 'CPM']}
                        selected={selectedKPI}
                        onChange={(kpi) => {
                            console.log('KPI changed to:', kpi);
                            setSelectedKPI(kpi as KPIType);
                        }}
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <SummaryCards adSets={newAdSets} kpiType={selectedKPI} />

            {/* Table Filter Controls */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Duration Range Slider */}
                    <RangeSlider
                        min={1}
                        max={7}
                        value={durationRange}
                        onChange={setDurationRange}
                        label="投放时长"
                    />

                    {/* Level Toggle */}
                    <LevelToggle
                        levels={['AdSet', 'Ad']}
                        selected={filterLevel}
                        onChange={(level) => setFilterLevel(level as 'AdSet' | 'Ad')}
                    />

                    {/* Search Input */}
                    <SearchInput
                        value={searchText}
                        onChange={setSearchText}
                        placeholder={`Search ${filterLevel} names...`}
                    />
                </div>
            </div>

            {/* New Audience Table */}
            <NewAudienceTable
                adSets={newAdSets}
                comparisonData={comparisonData}
                kpiType={selectedKPI}
                onCampaignClick={onCampaignClick}
                onTodoToggle={onTodoToggle}
                markedTodos={markedTodos}
                durationRange={durationRange}
                filterLevel={filterLevel}
                searchText={searchText}
            />
        </div>
    );
};
