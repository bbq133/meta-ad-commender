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
        if (stepNumber === 0) return 'step-prerequisite';   // 触发条件
        if (stepNumber === 1) return 'step-scenario';       // 核心异常场景
        if (stepNumber === 2) return 'step-drilldown';      // 下钻检查指标
        if (stepNumber === 3) return 'step-formula';        // 公式
        if (stepNumber === 4) return 'step-attribution';    // 归因诊断 (新位置)
        if (stepNumber === 5) return 'step-judgment';       // 判定条件 (原步骤4)
        if (stepNumber === 6) return 'step-trend';          // 趋势逻辑 (原步骤5)
        if (stepNumber === 7) {
            // 趋势决策 - 根据趋势状态变色 (原步骤6)
            const trend = content.trend;
            if (trend === 'improving') return 'step-decision-improving';
            if (trend === 'declining') return 'step-decision-declining';
            if (trend === 'stable') return 'step-decision-stable';
            return 'step-decision-stable';
        }
        if (stepNumber === 8) return 'step-action';         // Action建议 (原步骤7)
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
                <div className="condition-formula" style={{ whiteSpace: 'pre-line' }}>{content.condition}</div>
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
                    <div className="metric-name" style={{ whiteSpace: 'pre-line' }}>
                        <strong>{content.metric}</strong>
                    </div>
                )}
                {content.formula && (
                    <div className="formula-text" style={{ whiteSpace: 'pre-line' }}>
                        公式: <code>{content.formula}</code>
                    </div>
                )}
                {content.calculation && (
                    <div className="calculation-text" style={{ whiteSpace: 'pre-line' }}>
                        计算: <code>{content.calculation}</code>
                    </div>
                )}
            </div>
        );
    };

    // 渲染诊断结论
    const renderDiagnosis = () => {
        // 跳过步骤7（趋势决策），因为它有专门的renderTrendDecision
        if (!content.diagnosis || stepNumber === 7) return null;

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

    // 渲染趋势逻辑（步骤6）
    const renderTrendLogic = () => {
        if (stepNumber !== 6 || !content.l3dValue || !content.l7dValue) return null;

        const getTrendStatusClass = () => {
            if (content.trend === 'improving') return 'improving';
            if (content.trend === 'declining') return 'declining';
            return 'stable';
        };

        return (
            <div className="formula-block">
                <div className="formula-text">
                    公式: <code>{content.formula}</code>
                </div>
                <div className="trend-values">
                    <span>L3D: {content.l3dValue.toFixed(2)}</span>
                    <span>L7D: {content.l7dValue.toFixed(2)}</span>
                </div>
                {/* 隐藏趋势描述文字 */}
                {/* {content.description && (
                    <div className={`trend-status ${getTrendStatusClass()}`}>
                        {content.description}
                    </div>
                )} */}
            </div>
        );
    };

    // 渲染趋势决策（步骤7）
    const renderTrendDecision = () => {
        if (stepNumber !== 7) return null;

        const getTrendStatusClass = () => {
            if (content.trend === 'improving') return 'improving';
            if (content.trend === 'declining') return 'declining';
            return 'stable';
        };

        return (
            <div className="diagnosis-block">
                {/* 显示趋势状态 */}
                <div className={`trend-status ${getTrendStatusClass()}`}>
                    {content.diagnosis}
                </div>
                {/* 隐藏回暖提示信息 */}
                {/* {content.isRecoveryCase2 && content.recoveryMessage && (
                    <div className="recovery-message">
                        {content.recoveryMessage}
                    </div>
                )} */}
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
                {renderTrendLogic()}
                {renderTrendDecision()}
                {renderActions()}
            </div>
            {!isLast && <div className="step-connector"></div>}
        </div>
    );
};
