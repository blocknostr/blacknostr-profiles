
import { Navigate } from "react-router-dom";
import { useNostr } from "@/contexts/NostrContext";
import NoteFeed from "@/components/feed/NoteFeed";
import MainLayout from "@/components/layout/MainLayout";
import CreateNote from "@/components/feed/CreateNote";

const Index = () => {
  const { isAuthenticated } = useNostr();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return (
    <MainLayout>
      <div className="space-y-4">
        <CreateNote />
        <NoteFeed />
      </div>
    </MainLayout>
  );
};

export default Index;
