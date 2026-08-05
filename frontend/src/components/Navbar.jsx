import React from 'react';
import { Link } from 'react-router-dom';
import WalletButton from './WalletButton';

const Navbar = () => {
  return (
    <nav className="glass-panel navbar">
      <Link to="/" className="nav-logo text-gradient">StellarFund</Link>
      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/create-campaign">Create</Link>
      </div>
      <WalletButton />
    </nav>
  );
};

export default Navbar;
