import React from 'react';
import { DiagnosticStep } from '../../utils/campaignDiagnostics';
import './DiagnosticFlow.css';

interface DiagnosticStepCardProps {
    step: DiagnosticStep;
    isLast?: boolean;
}

export const DiagnosticStepCard: React.FC<DiagnosticStepCardProps> = ({ step, isLast }) => {
    const { stepNumber, stepName, icon, content } = step;

    // 根据步骤类型确定样式类
    const getStepClass = () => {
        if (stepNumber === 0) return 'step-prerequisite';
        if (stepNumber === 1) return 'step-scenario';
        if (stepNumber === 2) return 'step-drilldown';
        if (stepNumber === 3) return 'step-formula';       // 公式
        if (stepNumber === 4) return 'step-judgment';      // 判定条件
        if (stepNumber === 5) return 'step-attribution';   // 归因诊断
        if (stepNumber === 6) return 'step-action';        // Action建议
        if (stepNumber === 4) return 'step-attribution';
        if (stepNumber === 5) return 'step-action';
        return '';
    };

    // 格式化数值显示
    const formatValue = (value: number | undefined, isPercentage: boolean = false): string => {
        if (value === undefined) return '-';
        if (isPercentage) {
            return `${(value * 100).toFixed(2)}%`;
        }
        return value < 1 ? value.toFixed(4) : value.toFixed(2);
    };

    // 渲染条件判定
    const renderCondition = () => {
        if (!content.condition) return null;

        return (
            <div className="condition-block">
                <div className="condition-formula">{content.condition}</div>
                {content.actualValue !== undefined && content.thresholdValue !== undefined && (
                    <div className="condition-values">
                        <span className={content.result ? 'value-pass' : 'value-fail'}>
                            {formatValue(content.actualValue)} {content.result ? '✓' : '✗'}
                        </span>
                        <span className="value-separator">vs</span>
                        <span className="value-threshold">{formatValue(content.thresholdValue)}</span>
                    </div>
                )}
                {content.description && (
                    <div className="condition-description">{content.description}</div>
                )}
            </div>
        );
    };

    // 渲染公式计算
    const renderFormula = () => {
        if (!content.formula && !content.metric) return null;

        return (
            <div className="formula-block">
                {content.metric && (
                    <div className="metric-name">
                        <strong>{content.metric}</strong>
                    </div>
                )}
                {content.formula && (
                    <div className="formula-text">
                        公式: <code>{content.formula}</code>
                    </div>
                )}
                {content.calculation && (
                    <div className="calculation-text">
                        计算: <code>{content.calculation}</code>
                    </div>
                )}
            </div>
        );
    };

    // 渲染诊断结论
    const renderDiagnosis = () => {
        if (!content.diagnosis) return null;

        return (
            <div className="diagnosis-block">
                <div className="diagnosis-title">{content.diagnosis}</div>
                {content.description && (
                    <div className="diagnosis-description">{content.description}</div>
                )}
                {content.actualValue !== undefined && content.thresholdValue !== undefined && (
                    <div className="diagnosis-values">
                        <span className="value-label">当前:</span>
                        <span className="value-current">${formatValue(content.actualValue)}</span>
                        <span className="value-separator">|</span>
                        <span className="value-label">基准:</span>
                        <span className="value-benchmark">${formatValue(content.thresholdValue)}</span>
                    </div>
                )}
            </div>
        );
    };

    // 渲染Action建议
    const renderActions = () => {
        if (!content.actions || content.actions.length === 0) return null;

        return (
            <div className="actions-block">
                <div className="actions-title">优化建议</div>
                <ul className="actions-list">
                    {content.actions.map((action, index) => (
                        <li key={index} className={action.startsWith('【') ? 'action-category' : 'action-item'}>
                            {action}
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    return (
        <div className={`diagnostic-step-card ${getStepClass()}`}>
            <div className="step-header">
                {icon && <span className="step-icon">{icon}</span>}
                <span className="step-number">步骤 {stepNumber}</span>
                <span className="step-name">{stepName}</span>
            </div>
            <div className="step-content">
                {renderCondition()}
                {renderFormula()}
                {renderDiagnosis()}
                {renderActions()}
            </div>
            {!isLast && <div className="step-connector"></div>}
        </div>
    );
};
