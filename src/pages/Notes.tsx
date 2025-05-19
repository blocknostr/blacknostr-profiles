
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import NoteFeed from "@/components/feed/NoteFeed";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NoteBin from "@/components/notebin/NoteBin";

const Notes = () => {
  const [activeTab, setActiveTab] = useState<string>("feed");

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Notes</h1>
          <div className="flex items-center space-x-2">
            <Button 
              variant={activeTab === "feed" ? "default" : "outline"} 
              onClick={() => setActiveTab("feed")}
            >
              Feed
            </Button>
            <Button 
              variant={activeTab === "notebin" ? "default" : "outline"} 
              onClick={() => setActiveTab("notebin")}
            >
              NoteBin
            </Button>
          </div>
        </div>
        
        {activeTab === "feed" ? (
          <NoteFeed />
        ) : (
          <NoteBin />
        )}
      </div>
    </MainLayout>
  );
};

export default Notes;
