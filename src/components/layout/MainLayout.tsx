
import { useState } from "react";
import Sidebar from "./Sidebar";
import RightSidebar from "./RightSidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

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

      <ResizablePanelGroup
        direction="horizontal"
        className="w-full min-h-screen"
      >
        {/* Left Sidebar - hidden on mobile unless toggled */}
        <div className={`
          md:relative fixed top-0 left-0 h-screen z-20 w-80
          transform transition-transform duration-300 ease-in-out
          ${leftSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}>
          <ResizablePanel 
            defaultSize={20} 
            minSize={15} 
            maxSize={30}
            className="h-full hidden md:block"
          >
            <Sidebar />
          </ResizablePanel>
          
          {/* Mobile sidebar (non-resizable) */}
          <div className="md:hidden h-full">
            <Sidebar />
          </div>
        </div>

        {/* Main content - no scroll */}
        <ResizableHandle withHandle className="hidden md:flex" />
        
        <ResizablePanel defaultSize={60}>
          <div className="flex-grow max-w-3xl mx-auto px-4 py-6 md:px-6 h-screen">
            {children}
          </div>
        </ResizablePanel>

        {/* Right sidebar - always hidden on mobile */}
        <ResizableHandle withHandle className="hidden lg:flex" />
        
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="hidden lg:block">
          <RightSidebar />
        </ResizablePanel>
      </ResizablePanelGroup>

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
