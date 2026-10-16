import React, { createContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Notification Floating Container */}
      <div
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          pointerEvents: 'none',
          maxWidth: '420px',
          width: 'calc(100% - 2.5rem)',
        }}
      >
        {toasts.map((item) => {
          let icon = <Info size={18} className="text-cyan-400" />;
          let borderColor = 'rgba(6, 182, 212, 0.4)';
          let bgColor = 'rgba(15, 23, 42, 0.94)';

          if (item.type === 'success') {
            icon = <CheckCircle2 size={18} color="#10b981" />;
            borderColor = 'rgba(16, 185, 129, 0.4)';
          } else if (item.type === 'error') {
            icon = <AlertCircle size={18} color="#f43f5e" />;
            borderColor = 'rgba(244, 63, 94, 0.4)';
          } else if (item.type === 'warning') {
            icon = <AlertTriangle size={18} color="#f59e0b" />;
            borderColor = 'rgba(245, 158, 11, 0.4)';
          }

          return (
            <div
              key={item.id}
              className="animate-fade-in"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: bgColor,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${borderColor}`,
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                color: '#f9fafb',
                fontSize: '0.88rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {icon}
                <span style={{ lineHeight: 1.4 }}>{item.message}</span>
              </div>
              <button
                onClick={() => removeToast(item.id)}
                style={{
                  color: '#9ca3af',
                  marginLeft: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
