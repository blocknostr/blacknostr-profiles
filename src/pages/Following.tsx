
import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNostr } from '@/contexts/NostrContext';
import FollowingFeed from '@/components/feed/FollowingFeed';
import ContactList from '@/components/contacts/ContactList';

const Following: React.FC = () => {
  const { isAuthenticated, publicKey } = useNostr();
  const [activeTab, setActiveTab] = useState<string>('feed');

  return (
    <MainLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Following</h1>
        
        {!isAuthenticated && (
          <div className="bg-muted p-4 rounded-md text-center">
            <p>Please log in to see your following feed and contacts</p>
          </div>
        )}
        
        {isAuthenticated && (
          <Tabs defaultValue="feed" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="feed">Feed</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
            </TabsList>
            <TabsContent value="feed" className="mt-4">
              <FollowingFeed />
            </TabsContent>
            <TabsContent value="contacts" className="mt-4">
              <ContactList pubkey={publicKey || undefined} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
};

export default Following;
