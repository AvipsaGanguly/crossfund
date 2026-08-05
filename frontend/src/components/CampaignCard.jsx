import React from 'react';
import { Link } from 'react-router-dom';
import ProgressBar from './ProgressBar';

const CampaignCard = ({ id, title, desc, raised, goal, daysLeft, image }) => {
  const progress = goal > 0 ? (raised / goal) * 100 : 0;
  const descriptionText = desc && String(desc).trim() !== '' ? String(desc) : 'No description provided.';
  const hasImage = Boolean(image && String(image).trim() !== '');

  return (
    <Link to={`/campaign/${id}`} className="glass campaign-card animate-fade-in">
      {hasImage && (
        <div className="card-image-container">
          <img src={image} alt={title} className="card-image" />
        </div>
      )}
      <h3 className="card-title">{title}</h3>
      <p className="card-desc">{descriptionText}</p>

      <div>
        <div className="card-stats">
          <span><strong>{raised} XLM</strong> raised</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <ProgressBar progress={progress} />
        <div className="card-stats" style={{ marginTop: '0.5rem' }}>
          <span>Goal: {goal} XLM</span>
          <span>{daysLeft} days left</span>
        </div>
      </div>
    </Link>
  );
};

export default CampaignCard;
