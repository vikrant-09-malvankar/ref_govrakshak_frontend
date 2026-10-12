import React from 'react';
import {
  CheckCircle, Clock, AlertTriangle, XCircle, Truck, Package,
  Circle, Ban, RefreshCw, Activity, Info,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'pending' | 'neutral';
type BadgeSize    = 'xs' | 'sm' | 'md';

// Ordered status → variant + icon mapping
// Derived from the actual status values found in types/index.ts & orderWorkflow.ts
const STATUS_MAP: Record<string, { variant: BadgeVariant; icon: React.ElementType; label?: string }> = {
  // Asset statuses
  'Active':          { variant: 'success', icon: CheckCircle },
  'Deployed':        { variant: 'info',    icon: Activity },
  'Under Repair':    { variant: 'warning', icon: RefreshCw },
  'Disposed':        { variant: 'neutral', icon: Ban },

  // Order / PO statuses (from orderWorkflow.ts)
  'Pending Approval':{ variant: 'warning', icon: Clock },
  'Approved':        { variant: 'success', icon: CheckCircle },
  'Pending':         { variant: 'pending', icon: Clock },
  'In Progress':     { variant: 'info',    icon: Activity },
  'Delivered':       { variant: 'success', icon: Truck },
  'Completed':       { variant: 'success', icon: CheckCircle },
  'Rejected':        { variant: 'danger',  icon: XCircle },
  'Cancelled':       { variant: 'danger',  icon: Ban },

  // Delivery statuses
  'Not Started':     { variant: 'neutral', icon: Circle },
  'Scheduled':       { variant: 'pending', icon: Clock },
  'In Production':   { variant: 'info',    icon: Package },
  'In Transit':      { variant: 'info',    icon: Truck },
  'Out for Delivery':{ variant: 'info',    icon: Truck },
  'Received':        { variant: 'success', icon: CheckCircle },
  'Inspected':       { variant: 'info',    icon: Activity },
  'Accepted':        { variant: 'success', icon: CheckCircle },
  'Returned':        { variant: 'danger',  icon: XCircle },

  // Payment statuses
  'Paid':            { variant: 'success', icon: CheckCircle },
  'Partial':         { variant: 'warning', icon: AlertTriangle },
  'Overdue':         { variant: 'danger',  icon: AlertTriangle },
  'Disputed':        { variant: 'danger',  icon: AlertTriangle },

  // Complaint/device statuses
  'Open':            { variant: 'danger',  icon: AlertTriangle },
  'Resolved':        { variant: 'success', icon: CheckCircle },
  'Closed':          { variant: 'neutral', icon: Ban },
  'Allocated':       { variant: 'pending', icon: Package },
  'Acknowledged':    { variant: 'info',    icon: CheckCircle },
  'Verified':        { variant: 'success', icon: CheckCircle },
  'In Use':          { variant: 'success', icon: Activity },
  'Under Maintenance': { variant: 'warning', icon: RefreshCw },

  // Registration statuses
  'Failed':          { variant: 'danger',  icon: XCircle },

  // Priority
  'Low':             { variant: 'neutral', icon: Info },
  'Medium':          { variant: 'warning', icon: AlertTriangle },
  'High':            { variant: 'danger',  icon: AlertTriangle },
  'Critical':        { variant: 'danger',  icon: XCircle },
};

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-success-100 text-success-800 ring-success-600/20',
  warning: 'bg-warning-100 text-warning-800 ring-warning-600/20',
  danger:  'bg-danger-100  text-danger-800  ring-danger-600/20',
  info:    'bg-info-100    text-info-800    ring-info-600/20',
  pending: 'bg-slate-100   text-slate-700   ring-slate-500/20',
  neutral: 'bg-gray-100    text-gray-600    ring-gray-500/20',
};

const SIZE_CLASSES: Record<BadgeSize, { badge: string; icon: string }> = {
  xs: { badge: 'px-1.5 py-0.5 text-xs gap-1',   icon: 'w-3 h-3' },
  sm: { badge: 'px-2   py-0.5 text-xs gap-1',   icon: 'w-3 h-3' },
  md: { badge: 'px-2.5 py-1   text-xs gap-1.5', icon: 'w-3.5 h-3.5' },
};

// ─── StatusBadge ──────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string;
  size?: BadgeSize;
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  showIcon = true,
  className = '',
}) => {
  const mapping   = STATUS_MAP[status];
  const variant   = mapping?.variant ?? 'neutral';
  const IconComp  = mapping?.icon    ?? Circle;
  const { badge, icon } = SIZE_CLASSES[size];

  return (
    <span
      className={[
        'inline-flex items-center font-medium rounded-full ring-1 ring-inset',
        VARIANT_CLASSES[variant],
        badge,
        className,
      ].join(' ')}
    >
      {showIcon && <IconComp className={`${icon} shrink-0`} aria-hidden="true" />}
      <span>{status}</span>
    </span>
  );
};

// ─── Generic Badge ────────────────────────────────────────────────────────────
interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  icon,
  className = '',
  children,
}) => {
  const { badge, icon: iconCls } = SIZE_CLASSES[size];
  return (
    <span
      className={[
        'inline-flex items-center font-medium rounded-full ring-1 ring-inset',
        VARIANT_CLASSES[variant],
        badge,
        className,
      ].join(' ')}
    >
      {icon && <span className={`${iconCls} shrink-0`}>{icon}</span>}
      {children}
    </span>
  );
};

export default StatusBadge;
