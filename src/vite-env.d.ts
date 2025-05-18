
/// <reference types="vite/client" />

// Add process to the Window interface
interface Window {
  Buffer: typeof Buffer;
  process: {
    env: Record<string, string | undefined>;
  };
}
