
import React from "react";
import { NavLink } from "react-router-dom";
import { Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNostr } from "@/contexts/NostrContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function SimpleSidebar() {
  const { profile, isAuthenticated, logout } = useNostr();

  return (
    <div className="h-screen flex-shrink-0 w-64 border-r dark:border-nostr-border px-3 py-4 dark:bg-nostr-dark hidden md:block">
      {/* User Profile Section */}
      <div className="flex items-center space-x-2 mb-8 py-2">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile?.picture} alt={profile?.displayName || "User"} />
          <AvatarFallback>
            <User className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        <div className="truncate">
          <p className="text-sm font-medium truncate">
            {profile?.displayName || "Anonymous"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {profile?.npub ? `${profile.npub.substring(0, 8)}...` : "No npub"}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-2">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              "flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-muted transition-colors",
              isActive ? "bg-muted" : ""
            )
          }
        >
          <User className="h-5 w-5" />
          <span>Profile</span>
        </NavLink>
        
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-muted transition-colors",
              isActive ? "bg-muted" : ""
            )
          }
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* Logout Button */}
      {isAuthenticated && (
        <div className="mt-auto pt-4 border-t dark:border-nostr-border mt-8">
          <Button 
            variant="outline" 
            onClick={logout} 
            className="w-full"
          >
            Log out
          </Button>
        </div>
      )}
    </div>
  );
}
