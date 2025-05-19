
import { Button } from "@/components/ui/button";
import { useNostr } from "@/contexts/NostrContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Wallet, 
  Bell, 
  MessageSquare, 
  FileText, 
  BookOpen, 
  Gamepad, 
  Crown, 
  User, 
  Settings,
  PenSquare,
  Users
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function Sidebar() {
  const { isAuthenticated, profile, logout, publishNote } = useNostr();
  const [noteContent, setNoteContent] = useState("");
  const location = useLocation();
  
  const navItems = [
    { icon: <PenSquare className="h-5 w-5" />, label: "Notes", href: "/" },
    { icon: <Wallet className="h-5 w-5" />, label: "Wallets", href: "/wallets" },
    { icon: <Bell className="h-5 w-5" />, label: "Notifications", href: "/notifications" },
    { icon: <MessageSquare className="h-5 w-5" />, label: "Messages", href: "/messages" },
    { icon: <Users className="h-5 w-5" />, label: "Communities", href: "/daos" },
    { icon: <BookOpen className="h-5 w-5" />, label: "Articles", href: "/articles" },
    { icon: <Gamepad className="h-5 w-5" />, label: "Games", href: "/games" },
    { icon: <Crown className="h-5 w-5" />, label: "Premium", href: "/premium" },
    { icon: <User className="h-5 w-5" />, label: "Profile", href: "/profile" },
    { icon: <Settings className="h-5 w-5" />, label: "Settings", href: "/settings" },
  ];

  const handleCreateNote = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to create a note",
        variant: "destructive",
      });
      return;
    }
    
    // Show toast for demonstration (in a real app, this would open a modal or redirect)
    toast({
      title: "Create a new note",
      description: "This would open a note creation interface"
    });
  };

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

  // Function to determine if a link is active (including the root path for Notes)
  const isActive = (href: string) => {
    if (href === "/" && (location.pathname === "/" || location.pathname === "/notes")) {
      return true;
    }
    return location.pathname === href;
  };

  return (
    <div className="h-screen w-80 p-4 border-r border-border dark:bg-nostr-dark dark:border-white/10 fixed overflow-y-auto">
      {/* Logo and Theme Toggle */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-nostr-blue dark:text-nostr-blue">BlockNostr</h1>
        <ThemeToggle />
      </div>

      {/* Navigation Links - without the card container */}
      <div className="space-y-2 mb-6">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
              isActive(item.href) 
                ? "bg-muted dark:bg-white/10 text-nostr-blue" 
                : "hover:bg-muted dark:hover:bg-white/5"
            }`}
          >
            {item.icon}
            <span className="ml-3">{item.label}</span>
          </Link>
        ))}
      </div>
      
      {/* Create Note Button - Styled prominently */}
      <div className="mt-4 mb-6">
        <Button 
          onClick={handleCreateNote}
          className="w-full bg-nostr-blue hover:bg-nostr-blue/90 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center gap-2 text-base"
        >
          <PenSquare className="h-5 w-5" />
          Create Note
        </Button>
      </div>

      {/* User Profile moved to the bottom */}
      <div className="absolute bottom-4 left-0 right-0 px-4">
        <div className="flex flex-col space-y-3">
          {isAuthenticated && profile ? (
            <>
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
                size="sm"
                className="w-full dark:border-white/20 dark:bg-transparent dark:hover:bg-white/5 text-base" 
                onClick={handleConnectWallet}
              >
                <Wallet className="h-5 w-5 mr-2" />
                {isAuthenticated ? 
                  <div className="flex flex-col items-start">
                    <span className="text-xs">Connected:</span>
                    <span className="truncate text-sm max-w-[180px]">{profile.npub?.slice(0, 12)}...</span>
                  </div> : "Connect Wallet"}
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              className="w-full dark:border-white/20 dark:bg-transparent dark:hover:bg-white/5 text-base" 
              onClick={handleConnectWallet}
            >
              <Wallet className="h-5 w-5 mr-2" />
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
