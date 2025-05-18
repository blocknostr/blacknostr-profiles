import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Wallet, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { validateAddress } from '@alephium/web3';

interface WalletManagerProps {
  ecosystem: string;
}

interface WalletAddress {
  id: string;
  address: string;
}

const WalletManager = ({ ecosystem }: WalletManagerProps) => {
  const [wallets, setWallets] = useState<WalletAddress[]>([]);
  const [newAddress, setNewAddress] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const MAX_WALLETS = 5;

  // Load wallets from localStorage on component mount
  useEffect(() => {
    const savedWallets = localStorage.getItem(`${ecosystem}_wallets`);
    if (savedWallets) {
      setWallets(JSON.parse(savedWallets));
    } else {
      setWallets([]);
    }
  }, [ecosystem]);

  // Save wallets to localStorage when they change
  useEffect(() => {
    localStorage.setItem(`${ecosystem}_wallets`, JSON.stringify(wallets));
  }, [wallets, ecosystem]);

  const addWallet = async () => {
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

    setIsAdding(true);

    try {
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
        // Use Alephium SDK for validation
        try {
          // Fix: Don't directly compare the result with false
          // Instead, check if validateAddress() throws an error or not
          validateAddress(newAddress);
          // If we reach here, validation succeeded
        } catch (error) {
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
  
      setWallets([...wallets, { id: Date.now().toString(), address: newAddress }]);
      setNewAddress('');
      
      toast({
        title: "Wallet Added",
        description: "The wallet address has been added to your portfolio",
      });
    } catch (error) {
      console.error("Error adding wallet:", error);
      toast({
        title: "Error",
        description: "Failed to add wallet address",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const removeWallet = (id: string) => {
    setWallets(wallets.filter(wallet => wallet.id !== id));
    toast({
      title: "Wallet Removed",
      description: "The wallet address has been removed from your portfolio",
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium mb-2">Manage Wallets ({wallets.length}/{MAX_WALLETS})</h3>
      
      <div className="flex gap-2">
        <Input
          placeholder={`Enter ${ecosystem} wallet address...`}
          value={newAddress}
          onChange={(e) => setNewAddress(e.target.value)}
          className="flex-1 dark:bg-[#141518] dark:border-[#A0A0A0]/20"
        />
        <Button 
          onClick={addWallet} 
          disabled={wallets.length >= MAX_WALLETS || isAdding}
          className="dark:bg-[#00A3FF] dark:hover:bg-[#00A3FF]/90 dark:text-white"
        >
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          Add
        </Button>
      </div>
      
      {wallets.length > 0 ? (
        <div className="space-y-2 mt-4">
          {wallets.map((wallet) => (
            <Card key={wallet.id} className="dark:bg-[#1E2023] dark:border-[#A0A0A0]/20">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Wallet className="h-4 w-4 text-[#00A3FF]" />
                  <span className="truncate text-[#FFFFFF]">{wallet.address}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeWallet(wallet.id)}
                  className="dark:hover:bg-[#FFFFFF]/10"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-[#A0A0A0]">
          No wallets added yet. Add a wallet address to track your portfolio.
        </div>
      )}
    </div>
  );
}

export default WalletManager;
