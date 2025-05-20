
import { Button } from "@/components/ui/button";
import { useNostr } from "@/contexts/NostrContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Home, 
  MessageSquare, 
  User, 
  Settings,
  Search
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { toast } from "@/components/ui/use-toast";

export default function Sidebar() {
  const { isAuthenticated, profile, logout } = useNostr();
  const location = useLocation();
  
  const navItems = [
    { icon: <Home className="h-5 w-5" />, label: "Home", href: "/" },
    { icon: <MessageSquare className="h-5 w-5" />, label: "Messages", href: "/messages" },
    { icon: <User className="h-5 w-5" />, label: "Profile", href: "/profile" },
    { icon: <Settings className="h-5 w-5" />, label: "Settings", href: "/settings" },
  ];

  const handleConnectWallet = () => {
    if (isAuthenticated) {
      logout();
      toast({
        title: "Wallet disconnected",
        description: "You have successfully disconnected your wallet"
      });
    } else {
      toast({
        title: "Connect Wallet",
        description: "This would open a wallet connection interface"
      });
    }
  };

  return (
    <div className="h-screen w-64 p-4 border-r border-border dark:bg-nostr-dark dark:border-white/10 fixed overflow-y-auto flex flex-col">
      {/* Logo and Theme Toggle */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-nostr-blue dark:text-nostr-blue">BlockNostr</h1>
        <ThemeToggle />
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Button variant="outline" className="w-full justify-start dark:bg-transparent">
          <Search className="h-4 w-4 mr-2" />
          <span>Search</span>
        </Button>
      </div>

      {/* Navigation Links */}
      <div className="space-y-1 mb-6">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors dark:hover:bg-white/5 ${
              location.pathname === item.href 
                ? "bg-muted dark:bg-white/10 text-nostr-blue dark:text-white" 
                : "hover:bg-muted"
            }`}
          >
            {item.icon}
            <span className="ml-3">{item.label}</span>
          </Link>
        ))}
      </div>
      
      {/* User Profile moved to the bottom */}
      <div className="mt-auto">
        {isAuthenticated && profile ? (
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={profile.picture} alt={profile.displayName || "User"} />
                <AvatarFallback>{profile.displayName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <p className="text-base font-medium truncate">{profile.displayName || "Anonymous"}</p>
                <p className="text-sm text-muted-foreground truncate dark:text-nostr-muted">{profile.npub?.slice(0, 10)}...</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full dark:border-white/20 dark:bg-transparent dark:hover:bg-white/5 text-base"
              onClick={handleConnectWallet}
            >
              {isAuthenticated ? "Disconnect Wallet" : "Connect Wallet"}
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline" 
            className="w-full dark:border-white/20 dark:bg-transparent dark:hover:bg-white/5 text-base" 
            onClick={handleConnectWallet}
          >
            Connect Wallet
          </Button>
        )}
      </div>
    </div>
  );
}
