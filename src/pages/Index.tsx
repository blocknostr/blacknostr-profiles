
import { Navigate } from "react-router-dom";
import { useNostr } from "@/contexts/NostrContext";
import SimpleMainLayout from "@/components/layout/SimpleMainLayout";
import NoteFeed from "@/components/feed/NoteFeed";

const Index = () => {
  const { isAuthenticated, publicKey } = useNostr();
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <SimpleMainLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Latest Notes</h1>
        {publicKey && <NoteFeed />}
      </div>
    </SimpleMainLayout>
  );
};

export default Index;
