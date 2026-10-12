/**
 * OrderTimeline — visual step-by-step order lifecycle indicator.
 *
 * Steps: Submitted → Approved → Processing → Delivered → Completed
 * Terminal states: Cancelled | Rejected (show a warning banner instead of steps)
 */

import React from 'react';
import {
  FileText, CheckCircle, Package, Truck, PartyPopper,
  XCircle, Ban,
} from 'lucide-react';
import { getPublicOrderStatus } from '../../utils/orderWorkflow';

// ── Step definitions ───────────────────────────────────────────────────────────

interface Step {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const STEPS: Step[] = [
  {
    key:         'submitted',
    label:       'Submitted',
    icon:        <FileText  className="w-4 h-4" />,
    description: 'Purchase order submitted for review',
  },
  {
    key:         'approved',
    label:       'Approved',
    icon:        <CheckCircle className="w-4 h-4" />,
    description: 'Order approved by admin',
  },
  {
    key:         'processing',
    label:       'Processing',
    icon:        <Package className="w-4 h-4" />,
    description: 'Seller is preparing the shipment',
  },
  {
    key:         'delivered',
    label:       'Delivered',
    icon:        <Truck className="w-4 h-4" />,
    description: 'All batches delivered and OTP verified',
  },
  {
    key:         'completed',
    label:       'Completed',
    icon:        <PartyPopper className="w-4 h-4" />,
    description: 'Order confirmed complete by buyer',
  },
];

// ── Status → step index ────────────────────────────────────────────────────────

function resolveStepIndex(publicStatus: string): number {
  switch (publicStatus) {
    case 'Pending Approval':        return 0;
    case 'Approved':
    case 'Pending':                 return 1;
    case 'In Progress':             return 2;
    case 'Delivered':               return 3;
    case 'Completed':               return 4;
    default:                        return 0;
  }
}

function isTerminalStatus(publicStatus: string): 'cancelled' | 'rejected' | null {
  if (publicStatus === 'Cancelled') return 'cancelled';
  if (publicStatus === 'Rejected')  return 'rejected';
  return null;
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface OrderTimelineProps {
  status: string;
  approvedBy?: string | null;
  /** Optional timestamp per step key; shown below the step label if provided. */
  timestamps?: Partial<Record<string, string>>;
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  status,
  approvedBy,
  timestamps = {},
  className = '',
}) => {
  const publicStatus = getPublicOrderStatus({ status, approvedBy });
  const terminal     = isTerminalStatus(publicStatus);
  const currentIdx   = resolveStepIndex(publicStatus);

  // ── Terminal: cancelled / rejected ─────────────────────────────────────────
  if (terminal) {
    const isCancelled = terminal === 'cancelled';
    return (
      <div className={[
        'flex items-center gap-3 rounded-card px-4 py-3',
        isCancelled ? 'bg-gray-50 border border-gray-200' : 'bg-danger-50 border border-danger-200',
        className,
      ].join(' ')}>
        {isCancelled
          ? <Ban       className="w-5 h-5 text-gray-500 shrink-0" />
          : <XCircle   className="w-5 h-5 text-danger-500 shrink-0" />
        }
        <div>
          <p className={`text-sm font-semibold ${isCancelled ? 'text-gray-700' : 'text-danger-700'}`}>
            Order {isCancelled ? 'Cancelled' : 'Rejected'}
          </p>
          <p className={`text-xs mt-0.5 ${isCancelled ? 'text-gray-500' : 'text-danger-600'}`}>
            {isCancelled
              ? 'This order was cancelled and will not be processed.'
              : 'This order was rejected. Please contact the admin for details.'}
          </p>
        </div>
      </div>
    );
  }

  // ── Normal: step-by-step timeline ──────────────────────────────────────────
  return (
    <div className={['w-full', className].join(' ')}>
      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-start">
        {STEPS.map((step, idx) => {
          const done    = idx < currentIdx;
          const current = idx === currentIdx;
          const future  = idx > currentIdx;

          return (
            <React.Fragment key={step.key}>
              {/* Step bubble + label */}
              <div className="flex flex-col items-center flex-1 min-w-0">
                {/* Circle */}
                <div className={[
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                  done    ? 'bg-success-600 text-white'                                   : '',
                  current ? 'bg-primary-600 text-white ring-4 ring-primary-100'           : '',
                  future  ? 'bg-gray-100 text-gray-400 border-2 border-gray-200'          : '',
                ].join(' ')}>
                  {done
                    ? <CheckCircle className="w-4 h-4" />
                    : step.icon
                  }
                </div>

                {/* Label */}
                <p className={[
                  'mt-2 text-xs font-medium text-center leading-tight',
                  done    ? 'text-success-700' : '',
                  current ? 'text-primary-700' : '',
                  future  ? 'text-gray-400'    : '',
                ].join(' ')}>
                  {step.label}
                </p>

                {/* Timestamp */}
                {timestamps[step.key] && (
                  <p className="text-[10px] text-gray-400 mt-0.5 text-center">
                    {timestamps[step.key]}
                  </p>
                )}

                {/* Description (current only) */}
                {current && (
                  <p className="text-[10px] text-primary-500 mt-1 text-center px-1 leading-tight">
                    {step.description}
                  </p>
                )}
              </div>

              {/* Connector line (between steps) */}
              {idx < STEPS.length - 1 && (
                <div className="flex-shrink-0 w-8 mt-4">
                  <div className={[
                    'h-0.5 w-full transition-all duration-500',
                    idx < currentIdx ? 'bg-success-400' : 'bg-gray-200',
                  ].join(' ')} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile: vertical list */}
      <div className="sm:hidden flex flex-col">
        {STEPS.map((step, idx) => {
          const done    = idx < currentIdx;
          const current = idx === currentIdx;
          const future  = idx > currentIdx;
          const isLast  = idx === STEPS.length - 1;

          return (
            <div key={step.key} className="flex gap-3">
              {/* Left column: circle + connector */}
              <div className="flex flex-col items-center">
                <div className={[
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  done    ? 'bg-success-600 text-white'                          : '',
                  current ? 'bg-primary-600 text-white ring-4 ring-primary-100'  : '',
                  future  ? 'bg-gray-100 text-gray-400 border-2 border-gray-200' : '',
                ].join(' ')}>
                  {done ? <CheckCircle className="w-3.5 h-3.5" /> : step.icon}
                </div>
                {!isLast && (
                  <div className={[
                    'w-0.5 flex-1 my-1 min-h-[16px]',
                    done ? 'bg-success-300' : 'bg-gray-200',
                  ].join(' ')} />
                )}
              </div>

              {/* Right column: text */}
              <div className={`pb-4 flex-1 min-w-0 ${isLast ? '' : ''}`}>
                <p className={[
                  'text-sm font-medium',
                  done    ? 'text-success-700' : '',
                  current ? 'text-primary-700' : '',
                  future  ? 'text-gray-400'    : '',
                ].join(' ')}>
                  {step.label}
                </p>
                {(current || done) && (
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{step.description}</p>
                )}
                {timestamps[step.key] && (
                  <p className="text-[10px] text-gray-400 mt-0.5">{timestamps[step.key]}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTimeline;
