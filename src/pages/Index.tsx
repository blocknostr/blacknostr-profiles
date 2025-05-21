
import { Navigate } from "react-router-dom";
import { useNostr } from "@/contexts/NostrContext";
import NoteFeed from "@/components/feed/NoteFeed";
import MainLayout from "@/components/layout/MainLayout";

const Index = () => {
  const { isAuthenticated } = useNostr();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return (
    <MainLayout>
      <NoteFeed />
    </MainLayout>
  );
};

export default Index;
