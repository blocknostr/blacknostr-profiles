
import { useState, useEffect } from "react";
import { useNostr } from "@/contexts/NostrContext";
import MainLayout from "@/components/layout/MainLayout";
import NoteFeed from "@/components/feed/NoteFeed";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link, Calendar, MapPin, User, Edit, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EditProfileDialog from "@/components/profile/EditProfileDialog";

const Profile = () => {
  const { isAuthenticated, profile, publicKey } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  useEffect(() => {
    // Simulate profile loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please login to view your profile</h1>
          <Button asChild>
            <a href="/">Go to Login</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="flex items-start justify-between">
              <div className="flex space-x-4">
                <Skeleton className="h-24 w-24 rounded-full -mt-12 border-4 border-background" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ) : (
          <>
            {/* Banner */}
            <div 
              className="h-32 rounded-lg bg-cover bg-center" 
              style={{ 
                backgroundImage: profile?.banner ? `url(${profile.banner})` : 'linear-gradient(90deg, var(--nostr-primary) 0%, var(--nostr-secondary) 100%)' 
              }} 
            />

            {/* Profile info */}
            <div className="flex items-start justify-between">
              <div className="flex space-x-4">
                <div className="h-24 w-24 rounded-full -mt-12 border-4 border-background overflow-hidden bg-muted">
                  {profile?.picture ? (
                    <img 
                      src={profile.picture} 
                      alt={profile.displayName || "Profile"} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-full w-full p-4 text-muted-foreground" />
                  )}
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{profile?.displayName || "Anonymous"}</h1>
                    {profile?.nip05 && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>{profile.nip05}</span>
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{profile?.npub || ""}</p>
                </div>
              </div>
              <Button onClick={() => setEditProfileOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>

            {/* Bio */}
            <p className="text-sm">{profile?.about || "No bio yet"}</p>

            {/* Profile metadata */}
            <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-muted-foreground">
              {profile?.website && (
                <div className="flex items-center">
                  <Link className="h-4 w-4 mr-1" />
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {/* Placeholder data for demo */}
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Joined May 2023</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                <span>Earth</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-x-4 text-sm">
              <div>
                <span className="font-bold">120</span>
                <span className="text-muted-foreground ml-1">Following</span>
              </div>
              <div>
                <span className="font-bold">35</span>
                <span className="text-muted-foreground ml-1">Followers</span>
              </div>
            </div>

            {/* Posts/Likes tabs */}
            <Tabs defaultValue="posts" className="w-full mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
                <TabsTrigger value="replies" className="flex-1">Replies</TabsTrigger>
                <TabsTrigger value="media" className="flex-1">Media</TabsTrigger>
                <TabsTrigger value="likes" className="flex-1">Likes</TabsTrigger>
              </TabsList>
              <TabsContent value="posts" className="mt-4">
                {publicKey && <NoteFeed pubkey={publicKey} />}
              </TabsContent>
              <TabsContent value="replies" className="mt-4">
                <div className="text-center py-12 text-muted-foreground">
                  <p>No replies yet</p>
                </div>
              </TabsContent>
              <TabsContent value="media" className="mt-4">
                <div className="text-center py-12 text-muted-foreground">
                  <p>No media posts yet</p>
                </div>
              </TabsContent>
              <TabsContent value="likes" className="mt-4">
                <div className="text-center py-12 text-muted-foreground">
                  <p>No liked posts yet</p>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
      
      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
      />
    </MainLayout>
  );
};

export default Profile;
