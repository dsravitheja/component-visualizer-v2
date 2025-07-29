import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Add performance monitoring in development
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 Component Visualizer starting in development mode');
  
  // Add performance observer for debugging
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure') {
          console.log(`📊 Performance: ${entry.name} took ${entry.duration}ms`);
        }
      });
    });
    observer.observe({ entryTypes: ['measure'] });
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Add error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // You can add notification here if needed
});

// Add error handling for general errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});