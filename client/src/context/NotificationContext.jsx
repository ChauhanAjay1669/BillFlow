import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg, duration) => addToast({ message: msg, type: 'success', duration }), [addToast]);
  const error = useCallback((msg, duration) => addToast({ message: msg, type: 'error', duration }), [addToast]);
  const warning = useCallback((msg, duration) => addToast({ message: msg, type: 'warning', duration }), [addToast]);
  const info = useCallback((msg, duration) => addToast({ message: msg, type: 'info', duration }), [addToast]);

  return (
    <NotificationContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
