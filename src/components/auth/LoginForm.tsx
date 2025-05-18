
import { useState } from "react";
import { useNostr } from "@/contexts/NostrContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { hexToNpub, npubToHex } from "@/lib/nostr";

export function LoginForm() {
  const { login, createAccount } = useNostr();
  const [isLoading, setIsLoading] = useState(false);
  const [nsec, setNsec] = useState('');

  const handleLogin = () => {
    try {
      login();
      setIsLoading(false);
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login failed',
        description: 'Please check your credentials and try again',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleCreateAccount = () => {
    setIsLoading(true);
    try {
      createAccount();
      setIsLoading(false);
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: 'Account creation failed',
        description: 'Please try again later',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome to NOSTR</CardTitle>
        <CardDescription>
          Login with your existing account or create a new one
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button 
            className="w-full"
            onClick={handleLogin}
            disabled={isLoading}
          >
            Login with Existing Keys
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>

        <Button 
          variant="outline"
          className="w-full"
          onClick={handleCreateAccount}
          disabled={isLoading}
        >
          Create New Account
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-muted-foreground text-center">
          <p>By logging in or creating an account, you agree to the</p>
          <p>terms of service and privacy policy</p>
        </div>
      </CardFooter>
    </Card>
  );
}
