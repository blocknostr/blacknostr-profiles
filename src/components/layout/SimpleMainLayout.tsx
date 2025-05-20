
import React from "react";
import { useNostr } from "@/contexts/NostrContext";
import { Navigate } from "react-router-dom";

interface MainLayoutProps {
  children: React.ReactNode;
}

const SimpleMainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isAuthenticated } = useNostr();
  
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen dark:bg-nostr-dark bg-background">
      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 md:py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SimpleMainLayout;
