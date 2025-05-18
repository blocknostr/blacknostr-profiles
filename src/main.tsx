
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Polyfill Buffer for the browser environment
import { Buffer } from 'buffer'

// Make Buffer available globally in multiple ways to ensure compatibility
globalThis.Buffer = Buffer
window.Buffer = Buffer

// Define a minimal process object with the required properties
interface MinimalProcess {
  env: Record<string, string | undefined>;
}

// Create a proper process object for browser environment
const browserProcess = { env: {} } as MinimalProcess;

// Assign the process object to window
window.process = browserProcess;

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
