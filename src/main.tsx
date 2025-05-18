
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Buffer } from 'buffer';

// Make Buffer available globally
window.Buffer = Buffer;

// Provide a minimal process.env object for libraries that expect it
window.process = { env: {} } as any;

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
