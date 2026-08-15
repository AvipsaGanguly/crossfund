import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import * as Sentry from '@sentry/react';
import { ToastProvider } from './hooks/useToast';
import { WalletProvider } from './hooks/useWallet';
import { EventProvider } from './hooks/useEvents';
import LiveFeed from './components/LiveFeed';
import WalletSelectorModal from './components/WalletSelectorModal';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';

import './styles/globals.css';
import './styles/variables.css';
import './styles/animations.css';
import './styles/components.css';

const Home = lazy(() => import('./pages/Home'));
const CreateCampaign = lazy(() => import('./pages/CreateCampaign'));
const CampaignDetails = lazy(() => import('./pages/CampaignDetails'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const About = lazy(() => import('./pages/About'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<div className="glass" style={{ margin: '3rem auto', padding: '2rem', maxWidth: '500px', textAlign: 'center', color: '#f87171' }}>An unexpected application error occurred.</div>}>
      <ErrorBoundary>
        <ToastProvider>
          <WalletProvider>
            <EventProvider>
              <Router>
                <div className="app-container">
                  <Navbar />
                  <WalletSelectorModal />
                  <LiveFeed />
                  <main>
                    <Suspense fallback={<div className="loading-container">Loading...</div>}>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/create-campaign" element={<CreateCampaign />} />
                        <Route path="/campaign/:id" element={<CampaignDetails />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/about" element={<About />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </main>
                  <Footer />
                  <Analytics />
                </div>
              </Router>
            </EventProvider>
          </WalletProvider>
        </ToastProvider>
      </ErrorBoundary>
    </Sentry.ErrorBoundary>
  );
}

export default App;
