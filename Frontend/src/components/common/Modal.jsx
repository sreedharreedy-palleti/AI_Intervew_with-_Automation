import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '560px',
  showClose = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content animate-scale-up"
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{title}</h3>
          {showClose && (
            <button
              onClick={onClose}
              className="btn-ghost"
              style={{
                borderRadius: '8px',
                padding: '0.4rem',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
