
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Wallet, FilePlus, Trash, Circle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNostr } from "@/contexts/NostrContext";
import { toast } from "@/components/ui/use-toast";
import { Dialog } from "@/components/ui/dialog";
import tokenMetadata from "@/lib/tokenMetadata";

interface PortfolioOverviewProps {
  ecosystem: string;
}

interface WalletData {
  id: string;
  address: string;
  balance?: number;
  tokens?: Array<{ symbol: string; balance: number; value: number }>;
}

const PortfolioOverview = ({ ecosystem }: PortfolioOverviewProps) => {
  const { isAuthenticated } = useNostr();
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [walletsLoaded, setWalletsLoaded] = useState(false);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);
  
  // Load wallets from localStorage based on the selected ecosystem
  useEffect(() => {
    loadWallets();
  }, [ecosystem]);

  const loadWallets = () => {
    try {
      const savedWallets = localStorage.getItem(`${ecosystem}_wallets`);
      const walletData = savedWallets ? JSON.parse(savedWallets) : [];
      
      // Add mock balance and tokens data for demonstration
      const walletsWithData = walletData.map((wallet: WalletData) => ({
        ...wallet,
        balance: wallet.balance || generateRandomBalance(),
        tokens: wallet.tokens || generateRandomTokens(ecosystem),
      }));

      setWallets(walletsWithData);
      
      // Calculate total portfolio value
      const total = walletsWithData.reduce((sum: number, wallet: WalletData) => {
        const tokenValue = (wallet.tokens || []).reduce(
          (tokenSum: number, token) => tokenSum + token.value, 
          0
        );
        return sum + (wallet.balance || 0) + tokenValue;
      }, 0);
      
      setTotalValue(total);
      setWalletsLoaded(true);
    } catch (error) {
      console.error("Error loading wallets:", error);
      setWallets([]);
      setTotalValue(0);
      setWalletsLoaded(true);
    }
  };

  // Generate random balance for mock data
  const generateRandomBalance = () => {
    return parseFloat((Math.random() * 5 + 0.1).toFixed(3));
  };

  // Generate random tokens based on ecosystem
  const generateRandomTokens = (eco: string) => {
    const ecosystemTokens = tokenMetadata[eco] || [];
    const tokenCount = Math.floor(Math.random() * 3) + 1; // 1-3 tokens
    
    return ecosystemTokens.slice(0, tokenCount).map(token => {
      const tokenBalance = parseFloat((Math.random() * 100).toFixed(2));
      const tokenValue = parseFloat((tokenBalance * token.price).toFixed(2));
      
      return {
        symbol: token.symbol,
        balance: tokenBalance,
        value: tokenValue,
      };
    });
  };

  // Delete wallet
  const confirmDeleteWallet = (walletId: string) => {
    setWalletToDelete(walletId);
    setDeleteConfirmDialogOpen(true);
  };

  const deleteWallet = () => {
    if (!walletToDelete) return;
    
    try {
      const updatedWallets = wallets.filter(wallet => wallet.id !== walletToDelete);
      localStorage.setItem(`${ecosystem}_wallets`, JSON.stringify(updatedWallets));
      setWallets(updatedWallets);
      
      // Recalculate total value
      const newTotal = updatedWallets.reduce((sum, wallet) => {
        const tokenValue = (wallet.tokens || []).reduce(
          (tokenSum, token) => tokenSum + token.value, 
          0
        );
        return sum + (wallet.balance || 0) + tokenValue;
      }, 0);
      
      setTotalValue(newTotal);
      
      toast({
        title: "Wallet Removed",
        description: "The wallet has been removed from your portfolio.",
      });
    } catch (error) {
      console.error("Error deleting wallet:", error);
      toast({
        title: "Error",
        description: "Failed to remove the wallet.",
        variant: "destructive",
      });
    } finally {
      setWalletToDelete(null);
      setDeleteConfirmDialogOpen(false);
    }
  };

  // Function to format address for display
  const formatAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Card */}
      <Card className="dark:bg-nostr-dark dark:border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Portfolio Overview
          </CardTitle>
          <CardDescription>
            Track your {ecosystem.charAt(0).toUpperCase() + ecosystem.slice(1)} assets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-md bg-muted dark:bg-nostr-dark border dark:border-white/10">
              <div className="text-sm text-muted-foreground">Total Value</div>
              <div className="text-2xl font-medium">${totalValue.toFixed(2)}</div>
            </div>
            <div className="p-4 rounded-md bg-muted dark:bg-nostr-dark border dark:border-white/10">
              <div className="text-sm text-muted-foreground">Wallet Count</div>
              <div className="text-2xl font-medium">{wallets.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallets List Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Your {ecosystem.charAt(0).toUpperCase() + ecosystem.slice(1)} Wallets</h3>
      
        {walletsLoaded && wallets.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-md dark:border-white/20">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">No wallets added yet</p>
            <Button disabled={!isAuthenticated} className="dark:bg-nostr-dark dark:border-white/20">
              <FilePlus className="mr-2 h-4 w-4" />
              Add Wallet
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {wallets.map((wallet) => (
              <Card key={wallet.id} className="dark:bg-nostr-dark dark:border-white/20">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-muted dark:bg-black/30 flex items-center justify-center mr-3">
                        <Wallet className="h-5 w-5 text-nostr-blue" />
                      </div>
                      <div>
                        <p className="font-medium">{formatAddress(wallet.address)}</p>
                        <p className="text-sm text-muted-foreground">
                          {wallet.balance?.toFixed(4)} {ecosystem === 'bitcoin' ? 'BTC' : ecosystem === 'ethereum' ? 'ETH' : 'ALPH'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => confirmDeleteWallet(wallet.id)}
                      className="h-8 w-8 dark:hover:bg-white/5"
                    >
                      <Trash className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* Token List */}
                  {wallet.tokens && wallet.tokens.length > 0 && (
                    <div className="mt-4 pt-4 border-t dark:border-white/10">
                      <h4 className="text-sm font-medium mb-2">Tokens</h4>
                      <div className="space-y-2">
                        {wallet.tokens.map((token, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 rounded-md bg-muted/50 dark:bg-black/20">
                            <div className="flex items-center">
                              <Circle className="h-4 w-4 mr-2 text-nostr-blue" />
                              <span>{token.symbol}</span>
                            </div>
                            <div className="text-sm">
                              <div>{token.balance.toFixed(2)}</div>
                              <div className="text-muted-foreground text-xs">${token.value.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center ${deleteConfirmDialogOpen ? 'block' : 'hidden'}`}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} 
        >
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4 dark:bg-nostr-dark dark:border-white/20 border">
            <h3 className="text-lg font-medium mb-2">Confirm Deletion</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to remove this wallet from your portfolio? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setDeleteConfirmDialogOpen(false)} className="dark:border-white/20">
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteWallet}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default PortfolioOverview;
