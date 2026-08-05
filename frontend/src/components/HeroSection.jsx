import React from 'react';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <section className="hero">
      <h1 className="animate-slide-up">Fuel the Future with <br/><span className="text-gradient animate-float" style={{display: 'inline-block'}}>Stellar</span></h1>
      <p className="animate-slide-up" style={{animationDelay: '0.1s'}}>
        Empower creators, support innovation, and join a decentralized community of backers.
      </p>
      <div className="hero-actions animate-slide-up" style={{animationDelay: '0.2s'}}>
        <Link to="/create-campaign" className="btn btn-primary">Start a Campaign</Link>
        <Link to="/about" className="btn btn-outline">Learn More</Link>
      </div>
    </section>
  );
};

export default HeroSection;
