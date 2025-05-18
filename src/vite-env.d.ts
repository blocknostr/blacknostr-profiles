
/// <reference types="vite/client" />

// Add Buffer to the Window interface
interface Window {
  Buffer: typeof Buffer;
  // Define a simplified process object type for browser environment
  process: {
    env: Record<string, string | undefined>;
  };
}
