import React from 'react';

export const LoadingSkeleton = ({ height = '200px', width = '100%', borderRadius = '12px' }) => {
  return (
    <div className="skeleton" style={{ height, width, borderRadius }}></div>
  );
};

export const Spinner = ({ size = '20px', color = 'var(--accent-cyan)' }) => {
  return (
    <div
      className="spinner"
      style={{
        width: size,
        height: size,
        borderTopColor: color,
      }}
    />
  );
};

const LoadingSpinner = ({ text = 'Loading...' }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyInContent: 'center',
        padding: '2rem',
        gap: '1rem',
      }}
    >
      <Spinner size="40px" />
      {text && (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
