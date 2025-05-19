
import { Navigate } from "react-router-dom";
import { useNostr } from "@/contexts/NostrContext";

const Index = () => {
  const { isAuthenticated } = useNostr();
  return <Navigate to="/profile" />;
};

export default Index;
