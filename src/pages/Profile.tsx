
import { useState, useEffect } from "react";
import { useNostr } from "@/contexts/NostrContext";
import SimpleMainLayout from "@/components/layout/SimpleMainLayout";
import NoteFeed from "@/components/feed/NoteFeed";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link as RouterLink } from "react-router-dom";
import { 
  Link, 
  Calendar, 
  MapPin, 
  User, 
  Edit, 
  CheckCircle, 
  Settings,
  DollarSign,
  Coins,
  Contact,
  Globe,
  Layers,
  FileText,
  Code,
  MessageCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EditProfileDialog from "@/components/profile/EditProfileDialog";
import { nip19 } from "nostr-tools";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const Profile = () => {
  const { isAuthenticated, profile, publicKey, logout } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [marketDataOpen, setMarketDataOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);

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

  // NIP-19: Convert hex to bech32 format for display if not already converted
  const npub = profile?.npub || (publicKey ? nip19.npubEncode(publicKey) : null);

  return (
    <SimpleMainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <div className="space-x-2">
          <Button variant="outline" asChild>
            <RouterLink to="/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </RouterLink>
          </Button>
          <Button variant="outline" onClick={logout}>Logout</Button>
        </div>
      </div>

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
              <Button onClick={() => setEditProfileOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>

            {/* Bio */}
            {profile?.about && (
              <div className="flex items-start space-x-2">
                <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <p className="text-sm">{profile.about}</p>
              </div>
            )}

            {/* Profile metadata */}
            <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-muted-foreground">
              {profile?.website && (
                <div className="flex items-center">
                  <Globe className="h-4 w-4 mr-1" />
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {profile?.contact && (
                <div className="flex items-center">
                  <Contact className="h-4 w-4 mr-1" />
                  <span>{profile.contact}</span>
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

            {/* Cryptocurrency Market Data - Collapsible */}
            {(profile?.marketCap || profile?.fullyDilutedValuation || profile?.tradingVolume24h || 
              profile?.circulatingSupply || profile?.totalSupply || profile?.maxSupply || 
              profile?.coingeckoUrl) && (
              <div className="mt-4">
                <Collapsible 
                  open={marketDataOpen} 
                  onOpenChange={setMarketDataOpen} 
                  className="border rounded-lg p-4"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-md font-medium">Market Data</h3>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {marketDataOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent className="mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile?.coingeckoUrl && (
                        <div className="col-span-full">
                          <div className="flex items-center text-sm">
                            <Link className="h-4 w-4 mr-1 text-muted-foreground" />
                            <span className="text-muted-foreground mr-2">Coingecko URL:</span>
                            <a 
                              href={profile.coingeckoUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="hover:underline text-primary truncate"
                            >
                              {profile.coingeckoUrl.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        </div>
                      )}
                      
                      {profile?.marketCap && (
                        <div className="flex items-center text-sm">
                          <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground mr-2">Market Cap:</span>
                          <span>{profile.marketCap}</span>
                        </div>
                      )}
                      
                      {profile?.fullyDilutedValuation && (
                        <div className="flex items-center text-sm">
                          <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground mr-2">Fully Diluted Valuation:</span>
                          <span>{profile.fullyDilutedValuation}</span>
                        </div>
                      )}
                      
                      {profile?.tradingVolume24h && (
                        <div className="flex items-center text-sm">
                          <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground mr-2">24h Volume:</span>
                          <span>{profile.tradingVolume24h}</span>
                        </div>
                      )}
                      
                      {profile?.circulatingSupply && (
                        <div className="flex items-center text-sm">
                          <Coins className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground mr-2">Circulating Supply:</span>
                          <span>{profile.circulatingSupply}</span>
                        </div>
                      )}
                      
                      {profile?.totalSupply && (
                        <div className="flex items-center text-sm">
                          <Coins className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground mr-2">Total Supply:</span>
                          <span>{profile.totalSupply}</span>
                        </div>
                      )}
                      
                      {profile?.maxSupply && (
                        <div className="flex items-center text-sm">
                          <Coins className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground mr-2">Max Supply:</span>
                          <span>{profile.maxSupply}</span>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
            
            {/* Links and Categories - Collapsible */}
            {(profile?.explorers?.length || profile?.communities?.length || profile?.sourceCode || 
              profile?.chains?.length || profile?.categories?.length || profile?.apiId) && (
              <div className="mt-2">
                <Collapsible 
                  open={linksOpen} 
                  onOpenChange={setLinksOpen} 
                  className="border rounded-lg p-4"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Link className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-md font-medium">Links & Info</h3>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {linksOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent className="mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile?.sourceCode && (
                        <div className="flex items-center text-sm">
                          <Code className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground mr-2">Source Code:</span>
                          <a 
                            href={profile.sourceCode} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:underline text-primary truncate"
                          >
                            {profile.sourceCode.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                      
                      {profile?.apiId && (
                        <div className="flex items-center text-sm">
                          <Code className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground mr-2">API ID:</span>
                          <span>{profile.apiId}</span>
                        </div>
                      )}
                      
                      {profile?.explorers && profile.explorers.length > 0 && (
                        <div className="col-span-full">
                          <div className="flex items-start text-sm">
                            <Link className="h-4 w-4 mr-1 mt-1 text-muted-foreground flex-shrink-0" />
                            <div>
                              <span className="text-muted-foreground mr-2">Explorers:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {profile.explorers.map((explorer, idx) => (
                                  <Badge key={idx} variant="outline" className="flex items-center">
                                    <a 
                                      href={explorer.startsWith('http') ? explorer : `https://${explorer}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="hover:underline"
                                    >
                                      {explorer.replace(/^https?:\/\//, '')}
                                    </a>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {profile?.communities && profile.communities.length > 0 && (
                        <div className="col-span-full">
                          <div className="flex items-start text-sm">
                            <MessageCircle className="h-4 w-4 mr-1 mt-1 text-muted-foreground flex-shrink-0" />
                            <div>
                              <span className="text-muted-foreground mr-2">Communities:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {profile.communities.map((community, idx) => (
                                  <Badge key={idx} variant="outline">
                                    {community}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {profile?.chains && profile.chains.length > 0 && (
                        <div className="col-span-full">
                          <div className="flex items-start text-sm">
                            <Layers className="h-4 w-4 mr-1 mt-1 text-muted-foreground flex-shrink-0" />
                            <div>
                              <span className="text-muted-foreground mr-2">Chains:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {profile.chains.map((chain, idx) => (
                                  <Badge key={idx} variant="outline">
                                    {chain}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {profile?.categories && profile.categories.length > 0 && (
                        <div className="col-span-full">
                          <div className="flex items-start text-sm">
                            <Layers className="h-4 w-4 mr-1 mt-1 text-muted-foreground flex-shrink-0" />
                            <div>
                              <span className="text-muted-foreground mr-2">Categories:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {profile.categories.map((category, idx) => (
                                  <Badge key={idx} variant="outline">
                                    {category}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-x-4 text-sm mt-4">
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
    </SimpleMainLayout>
  );
};

export default Profile;
