
import React from "react";
import { useNostr } from "@/contexts/NostrContext";
import { SimpleSidebar } from "./SimpleSidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

const SimpleMainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isAuthenticated } = useNostr();
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please login to view this page</h1>
          <a 
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen dark:bg-nostr-dark">
      <SimpleSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="container max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SimpleMainLayout;
