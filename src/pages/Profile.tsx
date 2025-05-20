
import { useState, useEffect } from "react";
import { useNostr } from "@/contexts/NostrContext";
import SimpleMainLayout from "@/components/layout/SimpleMainLayout";
import NoteFeed from "@/components/feed/NoteFeed";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link as RouterLink } from "react-router-dom";
import { Calendar, MapPin, User, Edit, CheckCircle, ExternalLink, Copy, Share } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EditProfileDialog from "@/components/profile/EditProfileDialog";
import { nip19 } from "nostr-tools";
import { Card } from "@/components/ui/card";

const Profile = () => {
  const { isAuthenticated, profile, publicKey, logout } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Simulate profile loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // NIP-19: Convert hex to bech32 format for display if not already converted
  const npub = profile?.npub || (publicKey ? nip19.npubEncode(publicKey) : null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <SimpleMainLayout>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
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
        <div className="space-y-6">
          {/* Banner */}
          <div 
            className="h-40 rounded-xl bg-cover bg-center" 
            style={{ 
              backgroundImage: profile?.banner ? `url(${profile.banner})` : 'linear-gradient(90deg, #1a1f2c 0%, #2c3049 100%)' 
            }} 
          />
          
          <div className="flex flex-col gap-6">
            {/* Profile header section */}
            <div className="flex flex-col space-y-4">
              {/* Avatar and basic info */}
              <div className="flex items-start justify-between">
                <div className="flex">
                  <Avatar className="h-24 w-24 border-4 border-background -mt-12 mr-4">
                    {profile?.picture ? (
                      <AvatarImage src={profile.picture} alt={profile.displayName || "Profile"} />
                    ) : (
                      <AvatarFallback className="bg-nostr-blue/10 text-nostr-blue">
                        <User className="h-12 w-12" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-bold">{profile?.displayName || "Anonymous"}</h1>
                      {profile?.nip05 && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>{profile.nip05}</span>
                        </Badge>
                      )}
                    </div>
                    
                    {/* ID with copy button */}
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <span className="font-mono">{npub ? `${npub.substring(0, 8)}...${npub.substring(npub.length - 4)}` : ""}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 ml-1" 
                        onClick={() => npub && copyToClipboard(npub)}
                      >
                        {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <Button onClick={() => setEditProfileOpen(true)} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
              
              {/* Bio */}
              {profile?.about && (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{profile.about}</p>
              )}
              
              {/* Profile metadata */}
              <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-muted-foreground">
                {profile?.website && (
                  <div className="flex items-center">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                      {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Joined {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
                {profile?.location && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{profile.location}</span>
                  </div>
                )}
              </div>
              
              {/* Stats */}
              <div className="flex gap-x-6 text-sm">
                <div>
                  <span className="font-bold">120</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </div>
                <div>
                  <span className="font-bold">35</span>
                  <span className="text-muted-foreground ml-1">Followers</span>
                </div>
              </div>
            </div>
            
            {/* Share/follow buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
            
            {/* Card for external links - similar to njump.me */}
            <Card className="p-4 border border-border/50 shadow-sm">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">View elsewhere</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`https://njump.me/${npub}`} target="_blank" rel="noopener noreferrer">
                      njump.me
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`https://primal.net/p/${npub}`} target="_blank" rel="noopener noreferrer">
                      primal.net
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`https://snort.social/p/${npub}`} target="_blank" rel="noopener noreferrer">
                      snort.social
                    </a>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Posts/Likes tabs */}
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="replies">Replies</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="likes">Likes</TabsTrigger>
              </TabsList>
              <TabsContent value="posts" className="mt-0 space-y-4">
                {publicKey && <NoteFeed pubkey={publicKey} />}
              </TabsContent>
              <TabsContent value="replies" className="mt-0">
                <div className="text-center py-12 text-muted-foreground">
                  <p>No replies yet</p>
                </div>
              </TabsContent>
              <TabsContent value="media" className="mt-0">
                <div className="text-center py-12 text-muted-foreground">
                  <p>No media posts yet</p>
                </div>
              </TabsContent>
              <TabsContent value="likes" className="mt-0">
                <div className="text-center py-12 text-muted-foreground">
                  <p>No liked posts yet</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
      
      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
      />
    </SimpleMainLayout>
  );
};

export default Profile;
