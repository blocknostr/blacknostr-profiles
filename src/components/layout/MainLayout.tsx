
import { useState } from "react";
import Sidebar from "./Sidebar";
import RightSidebar from "./RightSidebar";
import { Button } from "@/components/ui/button";
import { Menu, PanelLeft, PanelRight } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  
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

      <div className="md:hidden fixed top-4 right-4 z-30">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className="dark:bg-black dark:border-white/10"
        >
          <PanelRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex w-full">
        {/* Left Sidebar - hidden on mobile unless toggled */}
        <div className={`
          md:relative fixed top-0 left-0 h-screen z-20 w-80
          transform transition-transform duration-300 ease-in-out
          ${leftSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          bg-background dark:bg-nostr-dark border-r border-border dark:border-white/10
        `}>
          {/* Fixed width sidebar */}
          <div className="h-full w-80 overflow-y-auto">
            <Sidebar />
          </div>
        </div>

        {/* Main content - scrollable with invisible scrollbar */}
        <div className="flex-grow h-screen overflow-y-auto scrollbar-hide px-4 py-6 md:px-6">
          <div className="max-w-3xl mx-auto">
            {children}
          </div>
        </div>

        {/* Right sidebar - hidden on mobile unless toggled */}
        <div className={`
          lg:relative fixed top-0 right-0 h-screen z-20 w-80
          transform transition-transform duration-300 ease-in-out
          ${rightSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
          bg-background dark:bg-nostr-dark border-l border-border dark:border-white/10
        `}>
          <div className="h-full w-80 overflow-y-auto">
            <RightSidebar />
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlays */}
      {leftSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 dark:bg-black/50 z-10"
          onClick={() => setLeftSidebarOpen(false)}
        />
      )}
      
      {rightSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/20 dark:bg-black/50 z-10"
          onClick={() => setRightSidebarOpen(false)}
        />
      )}
    </div>
  );
}
