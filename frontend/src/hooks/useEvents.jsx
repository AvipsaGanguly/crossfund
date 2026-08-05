import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { fetchRecentEvents } from '../services/eventService';
import { server } from '../services/contract';

const EventContext = createContext();

export const EventProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const lastLedgerRef = useRef(0);
  const [isPolling, setIsPolling] = useState(false);

  // Initial Sync to get the current ledger
  useEffect(() => {
    const init = async () => {
      try {
        const latest = await server.getLatestLedger();
        lastLedgerRef.current = latest.sequence;
        setIsPolling(true);
      } catch (err) {
        console.error("Failed to get latest ledger", err);
        // Default fallback
        setIsPolling(true);
      }
    };
    init();
  }, []);

  // Polling Loop
  useEffect(() => {
    if (!isPolling) return;

    let intervalId;
    const poll = async () => {
      if (lastLedgerRef.current === 0) return;
      const res = await fetchRecentEvents(lastLedgerRef.current + 1);
      
      if (res.events && res.events.length > 0) {
        setEvents(prev => {
          // Keep only the last 20 events in memory to prevent bloat
          const combined = [...res.events, ...prev];
          return combined.slice(0, 20);
        });
      }
      lastLedgerRef.current = res.latestLedger;
    };

    intervalId = setInterval(poll, 7000); // Poll every 7 seconds
    return () => clearInterval(intervalId);
  }, [isPolling]);

  const addOptimisticEvent = useCallback((event) => {
    setEvents(prev => [event, ...prev].slice(0, 20));
  }, []);

  return (
    <EventContext.Provider value={{ events, addOptimisticEvent }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = () => useContext(EventContext);
