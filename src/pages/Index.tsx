
import { Navigate } from "react-router-dom";
import { useNostr } from "@/contexts/NostrContext";

const Index = () => {
  const { isAuthenticated } = useNostr();
  return isAuthenticated ? <Navigate to="/profile" /> : <Navigate to="/login" />;
};

export default Index;
