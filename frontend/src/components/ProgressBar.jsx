import React from 'react';

const ProgressBar = ({ progress = 0 }) => {
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  return (
    <div className="progress-container">
      <div className="progress-fill" style={{ width: `${safeProgress}%` }}></div>
    </div>
  );
};

export default ProgressBar;
