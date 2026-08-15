import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.jsx';

// Initialize Sentry with configurable DSN (defaults to placeholder)
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || 'https://placeholderDSN@o0.ingest.sentry.io/0',
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 1.0,
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
