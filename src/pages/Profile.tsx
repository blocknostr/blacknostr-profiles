
import { useState, useEffect } from "react";
import { useNostr } from "@/contexts/NostrContext";
import SimpleMainLayout from "@/components/layout/SimpleMainLayout";
import NoteFeed from "@/components/feed/NoteFeed";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User, Edit, CheckCircle, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EditProfileDialog from "@/components/profile/EditProfileDialog";
import { nip19 } from "nostr-tools";
import { toast } from "@/components/ui/use-toast";

const Profile = () => {
  const { isAuthenticated, profile, publicKey, logout } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);

  useEffect(() => {
    // Simulate profile loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleConnectWallet = () => {
    if (isAuthenticated) {
      logout();
      toast({
        title: "Wallet disconnected",
        description: "You have successfully disconnected your wallet"
      });
    } else {
      setWalletDialogOpen(true);
    }
  };

  // NIP-19: Convert hex to bech32 format for display if not already converted
  const npub = profile?.npub || (publicKey ? nip19.npubEncode(publicKey) : null);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-xl shadow-lg border border-border/50">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Welcome to BlockNostr</h1>
            <p className="text-muted-foreground">Connect your wallet to continue</p>
          </div>
          
          <Button 
            className="w-full flex items-center justify-center gap-2"
            onClick={() => setWalletDialogOpen(true)}
          >
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            By connecting, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    );
  }

  return (
    <SimpleMainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="space-y-4">
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
            <>
              {/* Banner */}
              <div 
                className="h-32 rounded-xl bg-cover bg-center" 
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
                      {/* NIP-05 verification badge */}
                      {profile?.nip05 && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>{profile.nip05}</span>
                        </Badge>
                      )}
                    </div>
                    {/* NIP-19: Display bech32-encoded public key */}
                    <p className="text-sm text-muted-foreground">{npub ? `${npub.substring(0, 8)}...${npub.substring(npub.length - 4)}` : ""}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={handleConnectWallet}>
                    <Wallet className="h-4 w-4 mr-2" />
                    {isAuthenticated ? "Disconnect" : "Connect"}
                  </Button>
                  <Button onClick={() => setEditProfileOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </div>

              {/* Bio */}
              <p className="text-sm">{profile?.about || "No bio yet"}</p>

              {/* Profile metadata */}
              <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-muted-foreground">
                {profile?.website && (
                  <a 
                    href={profile.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:underline flex items-center"
                  >
                    <span className="text-primary">{profile.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Joined May 2023</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{profile?.location || "Earth"}</span>
                </div>
                {/* NIP-06: Lightning Address (if available) */}
                {profile?.lud16 && (
                  <div className="flex items-center">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4 mr-1" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M13 3L1 15l10 10L23 13 13 3z"/>
                    </svg>
                    <span>{profile.lud16}</span>
                  </div>
                )}
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
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
                  <TabsTrigger value="replies" className="flex-1">Replies</TabsTrigger>
                  <TabsTrigger value="media" className="flex-1">Media</TabsTrigger>
                  <TabsTrigger value="likes" className="flex-1">Likes</TabsTrigger>
                </TabsList>
                <TabsContent value="posts" className="mt-0">
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
            </>
          )}
        </div>
      </div>
      
      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
      />
    </SimpleMainLayout>
  );
};

export default Profile;
