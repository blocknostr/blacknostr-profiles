
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NostrProvider } from "@/contexts/NostrContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Wallets from "./pages/Wallets";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import DAOs from "./pages/DAOs";
import Articles from "./pages/Articles";
import Notes from "./pages/Notes";
import Games from "./pages/Games";
import Premium from "./pages/Premium";
import NotFound from "./pages/NotFound";

// Create a client
const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <NostrProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Notes />} />
                <Route path="/wallets" element={<Wallets />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/daos" element={<DAOs />} />
                <Route path="/articles" element={<Articles />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/games" element={<Games />} />
                <Route path="/premium" element={<Premium />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </NostrProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
