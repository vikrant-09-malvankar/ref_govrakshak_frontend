import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?:        React.ReactNode;
  title:        string;
  description?: string;
  action?:      { label: string; onClick: () => void; icon?: React.ReactNode };
  secondaryAction?: { label: string; onClick: () => void };
  className?:   string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
    <div className="mb-4 p-4 bg-surface-subtle rounded-full text-gray-400">
      {icon ?? <Inbox className="w-10 h-10" />}
    </div>
    <h3 className="text-heading-3 text-gray-900 mb-1">{title}</h3>
    {description && (
      <p className="text-small text-gray-500 max-w-sm mb-6">{description}</p>
    )}
    {(action || secondaryAction) && (
      <div className="flex items-center gap-3">
        {action && (
          <Button
            onClick={action.onClick}
            iconLeft={action.icon}
          >
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="secondary" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    )}
  </div>
);

export default EmptyState;
