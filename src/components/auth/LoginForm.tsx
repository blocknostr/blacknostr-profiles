
import { useState, useEffect } from "react";
import { useNostr } from "@/contexts/NostrContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Key, UserPlus } from "lucide-react";
import { npubToHex } from "@/lib/nostr";
import { useNavigate } from "react-router-dom";

export function LoginForm() {
  const { login, createAccount, loginWithPrivateKey, isAuthenticated } = useNostr();
  const [isLoading, setIsLoading] = useState(false);
  const [nsec, setNsec] = useState('');
  const [selectedTab, setSelectedTab] = useState('extension');
  const navigate = useNavigate();
  
  // Redirect to profile page if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile');
    }
  }, [isAuthenticated, navigate]);

  const handleExtensionLogin = () => {
    setIsLoading(true);
    try {
      // Try to detect nostr extension (e.g., nos2x, Alby, etc.)
      if (typeof window !== 'undefined' && window.nostr) {
        window.nostr.getPublicKey().then(pubkey => {
          if (pubkey) {
            login(pubkey);
            toast({
              title: 'Logged in with extension',
              description: 'Successfully logged in with your NOSTR extension',
            });
            navigate('/profile');
          } else {
            throw new Error('No public key found in extension');
          }
        }).catch(err => {
          console.error('Error getting public key from extension:', err);
          toast({
            title: 'Extension error',
            description: 'Could not get your public key from the extension',
            variant: 'destructive',
          });
        }).finally(() => {
          setIsLoading(false);
        });
      } else {
        toast({
          title: 'No NOSTR extension found',
          description: 'Please install a NOSTR extension like nos2x or Alby',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Extension login error:', error);
      toast({
        title: 'Login failed',
        description: 'Error connecting to your NOSTR extension',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    setIsLoading(true);
    try {
      createAccount();
      toast({
        title: 'Guest account created',
        description: 'You are now logged in as a guest user',
      });
      navigate('/profile');
    } catch (error) {
      console.error('Error creating guest account:', error);
      toast({
        title: 'Account creation failed',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLogin = () => {
    setIsLoading(true);
    try {
      if (!nsec) {
        toast({
          title: 'No private key',
          description: 'Please enter your private key (nsec)',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Remove prefix if present (nsec:)
      let privateKey = nsec;
      if (privateKey.startsWith('nsec')) {
        try {
          privateKey = npubToHex(nsec);
        } catch (error) {
          console.error('Invalid nsec format:', error);
          toast({
            title: 'Invalid private key',
            description: 'The private key format is not valid',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
      }

      loginWithPrivateKey(privateKey);
      setNsec('');
      navigate('/profile');
    } catch (error) {
      console.error('Manual login error:', error);
      toast({
        title: 'Login failed',
        description: 'Please check your private key and try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full bg-background/60 backdrop-blur-lg border-white/10 shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Welcome</CardTitle>
        <CardDescription className="text-center">
          Connect with the decentralized social network
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="extension" onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="extension" className="flex items-center justify-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Extension</span>
            </TabsTrigger>
            <TabsTrigger value="guest" className="flex items-center justify-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Guest</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center justify-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Manual</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="extension" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-6 text-center">
              <p>Connect using your NOSTR browser extension</p>
              <p className="mt-2 text-xs">Supported: nos2x, Alby, Flamingo, etc.</p>
            </div>
            <Button 
              className="w-full transition-all hover:scale-105"
              onClick={handleExtensionLogin}
              disabled={isLoading}
              variant="default"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Connect Extension
            </Button>
          </TabsContent>
          
          <TabsContent value="guest" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-6 text-center">
              <p>Create a temporary guest account</p>
              <p className="mt-2 text-xs">Your keys will be saved in this browser</p>
            </div>
            <Button 
              onClick={handleGuestLogin}
              disabled={isLoading}
              className="w-full transition-all hover:scale-105"
              variant="default"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create Guest Account
            </Button>
          </TabsContent>
          
          <TabsContent value="manual" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4 text-center">
              <p>Sign in with your private key (nsec)</p>
              <p className="mt-2 text-xs">Your key never leaves this device</p>
            </div>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Enter your nsec private key"
                value={nsec}
                onChange={(e) => setNsec(e.target.value)}
                className="bg-background/80 border-white/20"
              />
              <Button 
                onClick={handleManualLogin}
                disabled={isLoading || !nsec}
                className="w-full transition-all hover:scale-105"
                variant="default"
              >
                <Key className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 pt-0">
        <div className="text-xs text-muted-foreground text-center">
          <p>By logging in or creating an account, you agree to the</p>
          <p>terms of service and privacy policy</p>
        </div>
      </CardFooter>
    </Card>
  );
}
