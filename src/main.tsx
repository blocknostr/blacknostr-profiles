
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Polyfill Buffer for the browser environment
import { Buffer } from 'buffer'

// Make Buffer available globally in multiple ways to ensure compatibility
globalThis.Buffer = Buffer
window.Buffer = Buffer

// Create a minimal process object with the env property
// This is a simplified version that satisfies our TypeScript definition
window.process = { env: {} }

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
