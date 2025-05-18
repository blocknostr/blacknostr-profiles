
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

      {/* Left Sidebar - fixed on desktop, slide in on mobile */}
      <div className={`
        md:relative fixed top-0 left-0 z-20 w-80
        transform transition-transform duration-300 ease-in-out
        ${leftSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <Sidebar />
      </div>

      {/* Main content - scrollable */}
      <div className="flex-grow mx-auto px-4 py-6 md:px-6 md:ml-80 lg:mr-80 overflow-y-auto max-w-3xl">
        {children}
      </div>

      {/* Right sidebar - hidden on mobile, fixed on desktop */}
      <div className="hidden lg:block fixed right-0 top-0">
        <RightSidebar />
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
