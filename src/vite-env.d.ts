
/// <reference types="vite/client" />

// Add global Buffer type
interface Window {
  Buffer: typeof Buffer;
  process: {
    env: Record<string, string>;
  };
}
