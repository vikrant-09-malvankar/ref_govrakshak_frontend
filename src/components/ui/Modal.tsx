import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  /** Prevent closing on backdrop click */
  persistent?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full mx-4',
};

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  persistent = false,
  children,
  footer,
  className = '',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<Element | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement;

      requestAnimationFrame(() => {
        const focusable =
          dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

        focusable?.focus();
      });
    } else {
      if (previousFocus.current instanceof HTMLElement) {
        previousFocus.current.focus();
      }
    }
  }, [isOpen]);

  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !persistent) {
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables =
          dialogRef.current.querySelectorAll<HTMLElement>(
            FOCUSABLE_SELECTOR
          );

        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handler);

    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [isOpen, onClose, persistent]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="
          absolute inset-0
          bg-black/50
          dark:bg-black/70
          backdrop-blur-sm
        "
        onClick={persistent ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={[
          `
            relative w-full
            bg-white dark:bg-gray-900
            text-gray-900 dark:text-gray-100
            rounded-card
            shadow-modal
            dark:shadow-2xl
            flex flex-col
            max-h-[90vh]
            animate-slide-up
          `,
          SIZE_CLASSES[size],
          className,
        ].join(' ')}
      >
        {/* Header */}
        {title && (
          <div
            className="
              flex items-center justify-between
              px-6 py-4
              border-b
              border-surface-border dark:border-gray-700
            "
          >
            <h2
              id="modal-title"
              className="
                text-heading-3
                text-gray-900 dark:text-white
              "
            >
              {title}
            </h2>

            <button
              onClick={onClose}
              className="
                p-1.5
                text-gray-400
                hover:text-gray-600
                dark:text-gray-400
                dark:hover:text-gray-200
                hover:bg-gray-100
                dark:hover:bg-gray-800
                rounded-lg
                transition-colors
                focus:outline-none
                focus:ring-2
                focus:ring-primary-500
              "
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div
          className="
            flex-1
            overflow-y-auto
            px-6 py-5
            text-gray-700
            dark:text-gray-300
          "
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="
              px-6 py-4
              border-t
              border-surface-border dark:border-gray-700
              bg-surface-muted
              dark:bg-gray-800
              rounded-b-card
            "
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Drawer
// ─────────────────────────────────────────────────────────────────────────────

type DrawerSide = 'right' | 'left';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  side?: DrawerSide;
  width?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  side = 'right',
  width = 'w-[480px]',
  children,
  footer,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handler);

    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const slideClass =
    side === 'right'
      ? 'animate-slide-in-right'
      : 'animate-slide-in-left';

  const posClass = side === 'right' ? 'right-0' : 'left-0';

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="
          absolute inset-0
          bg-black/40
          dark:bg-black/70
          backdrop-blur-sm
        "
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`
          absolute top-0 ${posClass}
          h-full ${width} max-w-full
          bg-white dark:bg-gray-900
          text-gray-900 dark:text-gray-100
          shadow-modal dark:shadow-2xl
          flex flex-col
          ${slideClass}
        `}
      >
        {/* Header */}
        {title && (
          <div
            className="
              flex items-center justify-between
              px-6 py-4
              border-b
              border-surface-border dark:border-gray-700
            "
          >
            <h2
              className="
                text-heading-3
                text-gray-900 dark:text-white
              "
            >
              {title}
            </h2>

            <button
              onClick={onClose}
              className="
                p-1.5
                text-gray-400
                hover:text-gray-600
                dark:text-gray-400
                dark:hover:text-gray-200
                hover:bg-gray-100
                dark:hover:bg-gray-800
                rounded-lg
                transition-colors
                focus:outline-none
                focus:ring-2
                focus:ring-primary-500
              "
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div
          className="
            flex-1
            overflow-y-auto
            px-6 py-5
            text-gray-700
            dark:text-gray-300
          "
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="
              px-6 py-4
              border-t
              border-surface-border dark:border-gray-700
              bg-surface-muted
              dark:bg-gray-800
            "
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;