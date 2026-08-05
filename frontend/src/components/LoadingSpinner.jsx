import React from 'react';

// Renamed from Spinner to Skeleton usage or generic loaders
export const LoadingSkeleton = ({ height = '200px', width = '100%', borderRadius = '12px' }) => {
  return (
    <div className="skeleton" style={{ height, width, borderRadius }}></div>
  );
};

const LoadingSpinner = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <div className="skeleton" style={{width: '50px', height: '50px', borderRadius: '50%'}}></div>
    </div>
  );
};

export default LoadingSpinner;
