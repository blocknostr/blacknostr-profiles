
import { Button } from "@/components/ui/button";
import { useNostr } from "@/contexts/NostrContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { 
  SidebarGroup, 
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from "@/components/ui/sidebar";

export default function Sidebar() {
  const { isAuthenticated, profile, logout, publishNote } = useNostr();
  const [noteContent, setNoteContent] = useState("");
  const location = useLocation();
  
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
    
    toast({
      title: "Create a new note",
      description: "This would open a note creation interface"
    });
  };

  // Function to check if a nav item is active
  const isActive = (href: string) => {
    return location.pathname === href;
  };

  return (
    <div className="h-full flex flex-col p-4 dark:bg-nostr-dark">
      {/* Logo and Theme Toggle */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-nostr-blue dark:text-nostr-blue">BlockNostr</h1>
        <ThemeToggle />
      </div>

      {/* Navigation */}
      <SidebarGroup className="flex-grow">
        <SidebarGroupLabel className="font-medium text-sm">Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive(item.href)}
                  className="hover:bg-nostr-blue/10 dark:hover:bg-white/10 font-medium"
                >
                  <Link
                    to={item.href}
                    className="flex items-center gap-3"
                  >
                    <span className={isActive(item.href) ? "text-nostr-blue" : ""}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      
      {/* Create Note Button */}
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
        <div className="flex items-center space-x-3 p-3 hover:bg-nostr-blue/10 dark:hover:bg-white/5 rounded-md cursor-pointer transition-colors">
          <Avatar>
            <AvatarImage src={profile.picture} alt={profile.displayName || "User"} />
            <AvatarFallback>{profile.displayName?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate">{profile.displayName || "Anonymous"}</p>
            <p className="text-xs text-muted-foreground truncate dark:text-nostr-muted">{profile.npub || ""}</p>
          </div>
        </div>
      )}
      
      {isAuthenticated && (
        <Button variant="outline" className="mt-2 dark:border-white/20 dark:bg-transparent dark:hover:bg-white/5 font-medium" onClick={logout}>
          Logout
        </Button>
      )}
    </div>
  );
}
