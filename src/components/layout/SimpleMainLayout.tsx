
import React from "react";
import { useNostr } from "@/contexts/NostrContext";
import { Navigate } from "react-router-dom";

interface MainLayoutProps {
  children: React.ReactNode;
}

const SimpleMainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isAuthenticated } = useNostr();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen dark:bg-nostr-dark">
      <main className="flex-1 p-6 overflow-auto">
        <div className="container max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SimpleMainLayout;
