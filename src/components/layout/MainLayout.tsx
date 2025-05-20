
import { useState } from "react";
import Sidebar from "./Sidebar";
import RightSidebar from "./RightSidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  
  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar toggles */}
      <div className="md:hidden fixed top-4 left-4 z-30">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className="dark:bg-black dark:border-white/10"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex w-full">
        {/* Left Sidebar - hidden on mobile unless toggled */}
        <div className={`
          md:relative fixed top-0 left-0 h-screen z-20 w-80
          transform transition-transform duration-300 ease-in-out
          ${leftSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}>
          {/* Fixed width sidebar */}
          <div className="h-full w-80">
            <Sidebar />
          </div>
        </div>

        {/* Main content - scrollable with invisible scrollbar */}
        <div className="flex-grow max-w-3xl mx-auto px-4 py-6 md:px-6 h-screen overflow-y-auto scrollbar-hide">
          {children}
        </div>

        {/* Right sidebar - always hidden on mobile */}
        <div className="hidden lg:block w-80">
          <RightSidebar />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {leftSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 dark:bg-black/50 z-10"
          onClick={() => setLeftSidebarOpen(false)}
        />
      )}
    </div>
  );
}
