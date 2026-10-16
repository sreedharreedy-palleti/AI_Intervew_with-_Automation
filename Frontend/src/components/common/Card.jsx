import React from 'react';

const Card = ({
  children,
  elevated = false,
  className = '',
  style = {},
  onClick,
}) => {
  const baseClass = elevated ? 'glass-panel-elevated' : 'glass-panel';

  return (
    <div
      className={`${baseClass} ${className}`}
      style={{
        padding: '1.5rem',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
