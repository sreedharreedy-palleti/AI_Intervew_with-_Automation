import React from 'react';

const Input = ({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  icon = null,
  required = false,
  helperText,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={id} className="form-label">
          <span>
            {label} {required && <span style={{ color: 'var(--accent-rose)' }}>*</span>}
          </span>
        </label>
      )}

      <div style={{ position: 'relative' }}>
        {icon && (
          <div
            style={{
              position: 'absolute',
              left: '0.9rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            {icon}
          </div>
        )}

        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className="form-control"
          style={{
            paddingLeft: icon ? '2.5rem' : '1rem',
            borderColor: error ? 'var(--accent-rose)' : undefined,
          }}
          {...props}
        />
      </div>

      {error && <div className="form-error">{error}</div>}
      {helperText && !error && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.3rem' }}>
          {helperText}
        </div>
      )}
    </div>
  );
};

export default Input;
