
import React, { useState } from "react";
import { useNostr } from "@/contexts/NostrContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoginForm } from "@/components/auth/LoginForm";

interface MainLayoutProps {
  children: React.ReactNode;
}

const SimpleMainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isAuthenticated } = useNostr();
  const navigate = useNavigate();
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(!isAuthenticated);
  
  return (
    <>
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
          {isAuthenticated ? (
            children
          ) : (
            <div className="text-center py-10 space-y-4">
              <h2 className="text-2xl font-bold">Authentication Required</h2>
              <p className="text-muted-foreground">You need to sign in to access this page</p>
              <Button onClick={() => setIsLoginDialogOpen(true)}>Sign In</Button>
            </div>
          )}
        </main>
      </div>

      {/* Login Dialog */}
      <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect to NOSTR</DialogTitle>
            <DialogDescription>
              Sign in to access this page
            </DialogDescription>
          </DialogHeader>
          <LoginForm onSuccess={() => setIsLoginDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SimpleMainLayout;
