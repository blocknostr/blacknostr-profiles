
import { useState } from "react";
import Sidebar from "./Sidebar";
import RightSidebar from "./RightSidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { 
  SidebarProvider, 
  Sidebar as ShadcnSidebar,
  SidebarContent
} from "@/components/ui/sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        {/* Mobile sidebar toggle */}
        <div className="md:hidden fixed top-4 left-4 z-20">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="dark:bg-black dark:border-white/10"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Sidebar - hidden on mobile unless toggled */}
        <div className={`
          md:block fixed md:static top-0 left-0 h-screen z-10
          transform transition-transform duration-300 ease-in-out 
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          dark:border-r dark:border-white/10
        `}>
          <ShadcnSidebar className="w-64">
            <SidebarContent>
              <Sidebar />
            </SidebarContent>
          </ShadcnSidebar>
        </div>

        {/* Main content */}
        <div className="flex-grow max-w-3xl mx-auto px-4 py-6 md:px-6 md:ml-64">
          {children}
        </div>

        {/* Right sidebar */}
        <RightSidebar />

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/20 dark:bg-black/50 z-0"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </SidebarProvider>
  );
}
