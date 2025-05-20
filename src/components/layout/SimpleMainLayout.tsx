
import React from "react";
import { useNostr } from "@/contexts/NostrContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
}

const SimpleMainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isAuthenticated } = useNostr();
  const navigate = useNavigate();
  
  if (!isAuthenticated) {
    return <Navigate to="/profile" />;
  }

  return (
    <div className="min-h-screen dark:bg-nostr-dark bg-gray-50">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container max-w-4xl mx-auto py-2 px-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
      </div>
      
      <main className="container max-w-4xl mx-auto p-4 pt-6">
        {children}
      </main>
    </div>
  );
};

export default SimpleMainLayout;
