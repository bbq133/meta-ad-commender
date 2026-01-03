import React from 'react';

interface TodoMarkButtonProps {
    isMarked: boolean;
    onToggle: () => void;
}

export const TodoMarkButton: React.FC<TodoMarkButtonProps> = ({ isMarked, onToggle }) => {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
            className={`p-2 rounded-lg transition-all ${isMarked
                    ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                }`}
            title={isMarked ? 'Remove from Todo List' : 'Add to Todo List'}
        >
            <span className="text-lg">{isMarked ? '☑' : '☐'}</span>
        </button>
    );
};
