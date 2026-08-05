import React from 'react';

const StatsCard = ({ label, value }) => {
  return (
    <div className="glass stats-card animate-slide-up">
      <div className="stats-val text-gradient">{value}</div>
      <div className="stats-label">{label}</div>
    </div>
  );
};

export default StatsCard;
