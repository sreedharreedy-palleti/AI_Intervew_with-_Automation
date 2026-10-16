import React from 'react';

const Badge = ({ children, variant = 'primary', className = '' }) => {
  // variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  const variantClass = `badge-${variant}`;

  return <span className={`badge ${variantClass} ${className}`}>{children}</span>;
};

export default Badge;
