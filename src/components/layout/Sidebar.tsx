
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
  PenSquare
} from "lucide-react";
import { Link } from "react-router-dom";
import CreateNote from "../feed/CreateNote";

export default function Sidebar() {
  const { isAuthenticated, profile, logout } = useNostr();
  
  const navItems = [
    { icon: <Home className="h-5 w-5" />, label: "Home", href: "/" },
    { icon: <Wallet className="h-5 w-5" />, label: "Wallets", href: "/wallets" },
    { icon: <Bell className="h-5 w-5" />, label: "Notifications", href: "/notifications" },
    { icon: <MessageSquare className="h-5 w-5" />, label: "Messages", href: "/messages" },
    { icon: <FileText className="h-5 w-5" />, label: "DAOs", href: "/daos" },
    { icon: <BookOpen className="h-5 w-5" />, label: "Articles", href: "/articles" },
    { icon: <PenSquare className="h-5 w-5" />, label: "Notes", href: "/notes" },
    { icon: <Gamepad className="h-5 w-5" />, label: "Games", href: "/games" },
    { icon: <Crown className="h-5 w-5" />, label: "Premium", href: "/premium" },
    { icon: <User className="h-5 w-5" />, label: "Profile", href: "/profile" },
    { icon: <Settings className="h-5 w-5" />, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="h-screen border-r border-border flex flex-col p-4 w-64">
      {/* Logo */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-nostr-primary">NOSTR App</h1>
      </div>

      {/* Navigation */}
      <nav className="space-y-2 flex-grow">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors"
          >
            {item.icon}
            <span className="ml-3">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Create Note Section (moved from feed) */}
      <div className="mb-6">
        <CreateNote />
      </div>

      {/* User Profile */}
      {isAuthenticated && profile && (
        <div className="flex items-center space-x-3 p-3 hover:bg-muted rounded-md cursor-pointer">
          <Avatar>
            <AvatarImage src={profile.picture} alt={profile.displayName || "User"} />
            <AvatarFallback>{profile.displayName?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate">{profile.displayName || "Anonymous"}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.npub || ""}</p>
          </div>
        </div>
      )}
      
      {isAuthenticated && (
        <Button variant="outline" className="mt-2" onClick={logout}>
          Logout
        </Button>
      )}
    </div>
  );
}
