import React from 'react';

interface SkeletonProps {
  className?: string;
  lines?: number;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', lines, circle = false }) => {
  if (lines && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`animate-skeleton bg-gray-200 rounded ${i === lines - 1 ? 'w-3/4' : 'w-full'} h-4`}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className={[
        'animate-skeleton bg-gray-200',
        circle ? 'rounded-full' : 'rounded',
        className,
      ].join(' ')}
    />
  );
};

// ─── Pre-built skeleton layouts ───────────────────────────────────────────────
export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-card p-5 shadow-card">
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  </div>
);

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 8,
  cols = 5,
}) => (
  <tbody>
    {Array.from({ length: rows }).map((_, i) => (
      <TableRowSkeleton key={i} cols={cols} />
    ))}
  </tbody>
);

export const CardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-card p-5 shadow-card space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <Skeleton lines={3} />
  </div>
);

export default Skeleton;
