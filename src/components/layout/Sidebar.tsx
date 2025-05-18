
import { Button } from "@/components/ui/button";
import { useNostr } from "@/contexts/NostrContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Home, 
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
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function Sidebar() {
  const { isAuthenticated, profile, logout, publishNote } = useNostr();
  const [noteContent, setNoteContent] = useState("");
  
  const navItems = [
    { icon: <Home className="h-5 w-5" />, label: "Home", href: "/" },
    { icon: <Wallet className="h-5 w-5" />, label: "Wallets", href: "/wallets" },
    { icon: <Bell className="h-5 w-5" />, label: "Notifications", href: "/notifications" },
    { icon: <MessageSquare className="h-5 w-5" />, label: "Messages", href: "/messages" },
    { icon: <Users className="h-5 w-5" />, label: "Communities", href: "/daos" },
    { icon: <BookOpen className="h-5 w-5" />, label: "Articles", href: "/articles" },
    { icon: <PenSquare className="h-5 w-5" />, label: "Notes", href: "/notes" },
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

  return (
    <div className="h-screen w-80 p-4 border-r border-border dark:bg-nostr-dark dark:border-white/10">
      {/* Logo and Theme Toggle */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-nostr-blue dark:text-nostr-blue">BlockNostr</h1>
        <ThemeToggle />
      </div>

      {/* Navigation */}
      <Card className="mb-6 dark:bg-nostr-cardBg dark:border-white/10">
        <CardHeader className="pb-3">
          <CardTitle>Navigation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors dark:hover:bg-white/5"
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
      
      {/* Create Note Button - Styled prominently */}
      <div className="mt-4 mb-6">
        <Button 
          onClick={handleCreateNote}
          className="w-full bg-nostr-blue hover:bg-nostr-blue/90 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center gap-2"
        >
          <PenSquare className="h-4 w-4" />
          Create Note
        </Button>
      </div>

      {/* User Profile */}
      {isAuthenticated && profile && (
        <Card className="dark:bg-nostr-cardBg dark:border-white/10">
          <CardHeader className="pb-3">
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3 mb-4">
              <Avatar>
                <AvatarImage src={profile.picture} alt={profile.displayName || "User"} />
                <AvatarFallback>{profile.displayName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{profile.displayName || "Anonymous"}</p>
                <p className="text-xs text-muted-foreground truncate dark:text-nostr-muted">{profile.npub || ""}</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full dark:border-white/20 dark:bg-transparent dark:hover:bg-white/5" 
              onClick={logout}
            >
              Logout
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
