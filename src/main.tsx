import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept console.error to filter out benign "react-to-print" resource loading warnings
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const match = args.some(arg => 
    typeof arg === 'string' && 
    (arg.includes('react-to-print') || arg.includes('unable to load a resource'))
  );
  if (match) {
    console.warn('[react-to-print-intercepted]', ...args);
    return;
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

