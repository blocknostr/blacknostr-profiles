
import { useState, useEffect, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Wallet, LocalStorage } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface WalletAddress {
  id: string;
  address: string;
}

interface WalletDialogProps {
  ecosystem: string;
  children: ReactNode;
}

const WalletDialog = ({ ecosystem, children }: WalletDialogProps) => {
  const [wallets, setWallets] = useState<WalletAddress[]>([]);
  const [newAddress, setNewAddress] = useState('');
  const MAX_WALLETS = 5;
  const [open, setOpen] = useState(false);

  // Load wallets from localStorage when component mounts or dialog opens
  useEffect(() => {
    if (open) {
      loadWallets();
    }
  }, [ecosystem, open]);

  // Load wallets from localStorage
  const loadWallets = () => {
    try {
      const savedWallets = localStorage.getItem(`${ecosystem}_wallets`);
      if (savedWallets) {
        setWallets(JSON.parse(savedWallets));
      } else {
        setWallets([]);
      }
    } catch (error) {
      console.error("Error loading wallets from localStorage:", error);
      setWallets([]);
    }
  };

  // Save wallets to localStorage
  const saveWallets = (walletsToSave: WalletAddress[]) => {
    try {
      localStorage.setItem(`${ecosystem}_wallets`, JSON.stringify(walletsToSave));
      console.log(`Saved ${walletsToSave.length} wallets to localStorage for ${ecosystem}`);
    } catch (error) {
      console.error("Error saving wallets to localStorage:", error);
      toast({
        title: "Error",
        description: "Failed to save wallet data",
        variant: "destructive",
      });
    }
  };

  const addWallet = () => {
    if (!newAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter a wallet address",
        variant: "destructive",
      });
      return;
    }

    if (wallets.length >= MAX_WALLETS) {
      toast({
        title: "Limit Reached",
        description: `You can track a maximum of ${MAX_WALLETS} wallets per ecosystem`,
        variant: "destructive",
      });
      return;
    }

    // Simple validation based on ecosystem
    let isValid = true;
    let errorMsg = "";

    if (ecosystem === "bitcoin") {
      // Simple Bitcoin address validation (starts with 1, 3, or bc1)
      if (!(newAddress.startsWith('1') || newAddress.startsWith('3') || newAddress.startsWith('bc1'))) {
        isValid = false;
        errorMsg = "Invalid Bitcoin address format";
      }
    } else if (ecosystem === "ethereum") {
      // Simple Ethereum address validation (0x followed by 40 hex chars)
      if (!newAddress.startsWith('0x') || newAddress.length !== 42) {
        isValid = false;
        errorMsg = "Invalid Ethereum address format";
      }
    } else if (ecosystem === "alephium") {
      // Updated Alephium address validation - addresses can start with 1, r, or be a 58-character hex string
      if (!(newAddress.startsWith('1') || newAddress.startsWith('r') || 
          (newAddress.match(/^[0-9a-fA-F]{58}$/)))) {
        isValid = false;
        errorMsg = "Invalid Alephium address format";
      }
    }

    if (!isValid) {
      toast({
        title: "Invalid Address",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate addresses
    if (wallets.some(wallet => wallet.address === newAddress)) {
      toast({
        title: "Duplicate Address",
        description: "This address is already in your portfolio",
        variant: "destructive",
      });
      return;
    }

    const newWallet = { 
      id: Date.now().toString(), 
      address: newAddress 
    };
    
    const updatedWallets = [...wallets, newWallet];
    setWallets(updatedWallets);
    saveWallets(updatedWallets);
    setNewAddress('');
    
    toast({
      title: "Wallet Added",
      description: "The wallet address has been added to your portfolio",
    });
  };

  const removeWallet = (id: string) => {
    const updatedWallets = wallets.filter(wallet => wallet.id !== id);
    setWallets(updatedWallets);
    saveWallets(updatedWallets);
    
    toast({
      title: "Wallet Removed",
      description: "The wallet address has been removed from your portfolio",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children}
      <DialogContent className="dark:bg-nostr-cardBg dark:border-white/20 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <LocalStorage className="h-5 w-5 mr-2 text-nostr-blue" />
            Manage Wallets
          </DialogTitle>
          <DialogDescription>
            Add or remove wallet addresses to track in your portfolio ({wallets.length}/{MAX_WALLETS})
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={`Enter ${ecosystem} wallet address...`}
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="flex-1 dark:bg-nostr-dark dark:border-white/20"
            />
            <Button 
              onClick={addWallet} 
              disabled={wallets.length >= MAX_WALLETS}
              className="dark:bg-nostr-blue dark:hover:bg-nostr-blue/90 dark:text-white"
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          
          {wallets.length > 0 ? (
            <div className="space-y-2 mt-4">
              {wallets.map((wallet) => (
                <div key={wallet.id} className="flex items-center justify-between py-2 px-3 rounded-md dark:bg-nostr-dark">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Wallet className="h-4 w-4 text-nostr-blue shrink-0" />
                    <span className="truncate text-sm">{wallet.address}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeWallet(wallet.id)}
                    className="dark:hover:bg-white/10"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No wallets added yet. Add a wallet address to track your portfolio.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletDialog;
