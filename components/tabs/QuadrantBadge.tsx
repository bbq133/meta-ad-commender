import React from 'react';
import { QuadrantType, getQuadrantInfo } from '../../utils/quadrantUtils';

interface QuadrantBadgeProps {
    quadrant: QuadrantType;
}

export const QuadrantBadge: React.FC<QuadrantBadgeProps> = ({ quadrant }) => {
    const info = getQuadrantInfo(quadrant);

    return (
        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${info.color}`}>
            <span>{info.icon}</span>
            <span>{info.label}</span>
        </div>
    );
};
