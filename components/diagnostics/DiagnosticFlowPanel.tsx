import React from 'react';
import { DiagnosticDetail } from '../../utils/campaignDiagnostics';
import { DiagnosticStepCard } from './DiagnosticStepCard';
import './DiagnosticFlow.css';

interface DiagnosticFlowPanelProps {
    detail: DiagnosticDetail;
}

export const DiagnosticFlowPanel: React.FC<DiagnosticFlowPanelProps> = ({ detail }) => {
    const { steps, subProblems } = detail;

    // 渲染普通步骤流程
    const renderNormalFlow = () => {
        // 确保步骤按stepNumber排序
        const sortedSteps = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
        
        return (
            <div className="diagnostic-flow">
                {sortedSteps.map((step, index) => (
                    <DiagnosticStepCard
                        key={`step-${step.stepNumber}-${index}`}
                        step={step}
                        isLast={index === sortedSteps.length - 1}
                    />
                ))}
            </div>
        );
    };

    // 渲染多问题流程（Double Kill等）
    const renderMultiProblemFlow = () => {
        if (!subProblems || subProblems.length === 0) {
            return renderNormalFlow();
        }

        // 找出前提条件和核心场景步骤
        const prerequisiteStep = steps.find(s => s.stepNumber === 0);
        const scenarioStep = steps.find(s => s.stepNumber === 1);
        const actionStep = steps.find(s => s.stepNumber === 6);

        return (
            <div className="diagnostic-flow">
                {/* 前提条件 */}
                {prerequisiteStep && (
                    <DiagnosticStepCard step={prerequisiteStep} isLast={false} />
                )}

                {/* 核心场景 */}
                {scenarioStep && (
                    <DiagnosticStepCard step={scenarioStep} isLast={false} />
                )}

                {/* 多问题分支 */}
                <div className="sub-problems-container">
                    <div className="sub-problems-header">
                        <span className="sub-problems-icon">🔀</span>
                        <span className="sub-problems-title">发现 {subProblems.length} 个问题</span>
                    </div>
                    <div className="sub-problems-list">
                        {subProblems.map((problem, index) => (
                            <div key={`problem-${index}`} className="sub-problem-item">
                                <div className="sub-problem-header">
                                    <span className="sub-problem-badge">问题 {index + 1}</span>
                                    <span className="sub-problem-name">{problem.name}</span>
                                </div>
                                <div className="sub-problem-steps">
                                    {problem.steps.map((step, stepIndex) => (
                                        <DiagnosticStepCard
                                            key={`problem-${index}-step-${stepIndex}`}
                                            step={step}
                                            isLast={stepIndex === problem.steps.length - 1}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action建议 */}
                {actionStep && (
                    <>
                        <div className="step-connector"></div>
                        <DiagnosticStepCard step={actionStep} isLast={true} />
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="diagnostic-flow-panel">
            <div className="flow-header">
                <span className="flow-icon">📊</span>
                <span className="flow-title">诊断流程</span>
            </div>
            {subProblems && subProblems.length > 0 ? renderMultiProblemFlow() : renderNormalFlow()}
        </div>
    );
};
