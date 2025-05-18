import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { NodeProvider, web3 } from '@alephium/web3';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

// Define AddressBalance type to match API response structure
interface AddressBalance {
  address?: string;
  balance: string;
  lockedBalance: string;
  numTxs?: number;
}

const MAINNET_NODE_URL = 'https://node.mainnet.alephium.org';

const AlephiumSection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [balances, setBalances] = useState<AddressBalance[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if already connected
    try {
      // Safely check if the node provider is initialized
      const provider = web3.getCurrentNodeProvider();
      if (provider) {
        setIsConnected(true);
        setMessage("Connected to Alephium blockchain");
        // If connected, attempt to load wallet balances
        loadWalletBalances().catch(err => {
          console.error("Failed to load initial wallet balances:", err);
        });
      }
    } catch (error) {
      console.error("Error checking connection:", error);
      setMessage("Error checking Alephium connection");
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadWalletBalances();
    }
  }, [isConnected]);

  const loadWalletBalances = async () => {
    try {
      setIsLoading(true);
      
      // Get wallet addresses from local storage
      const savedWallets = localStorage.getItem(`alephium_wallets`);
      if (!savedWallets) {
        setMessage("No Alephium wallets found. Please add a wallet address.");
        setIsLoading(false);
        return;
      }
      
      const wallets = JSON.parse(savedWallets);
      if (wallets.length === 0) {
        setMessage("No Alephium wallets found. Please add a wallet address.");
        setIsLoading(false);
        return;
      }
      
      // Fetch balances for each wallet
      const fetchedBalances: AddressBalance[] = [];
      const nodeProvider = web3.getCurrentNodeProvider();
      
      if (!nodeProvider) {
        throw new Error("Node provider not initialized");
      }
      
      for (const wallet of wallets) {
        try {
          const balance = await nodeProvider.addresses.getAddressesAddressBalance(wallet.address);
          // Add the address property to match our interface
          const addressBalance: AddressBalance = {
            ...balance,
            address: wallet.address,
            numTxs: 0 // Default value if not provided by API
          };
          fetchedBalances.push(addressBalance);
        } catch (err) {
          console.error(`Error fetching balance for ${wallet.address}:`, err);
        }
      }
      
      setBalances(fetchedBalances);
      setMessage(`Successfully loaded ${fetchedBalances.length} wallet balances`);
    } catch (error) {
      console.error("Failed to load wallet balances:", error);
      setMessage("Failed to load wallet balances");
      
      toast({
        title: "Error Loading Balances",
        description: "Could not load Alephium wallet balances",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectToAlephium = async () => {
    try {
      setIsLoading(true);
      setMessage("Connecting to Alephium blockchain...");
      
      console.log("Attempting to connect to Alephium network...");
      
      // Create a new NodeProvider with explicit error handling
      const nodeProvider = new NodeProvider(MAINNET_NODE_URL);
      console.log("NodeProvider created");
      
      // Set the current node provider
      web3.setCurrentNodeProvider(nodeProvider);
      console.log("NodeProvider set globally");
      
      // Test the connection with a simple API call
      try {
        const nodeInfo = await nodeProvider.infos.getInfosNode();
        console.log("Connection test successful:", nodeInfo.buildInfo);
      } catch (testError) {
        console.error("Connection test failed:", testError);
        throw new Error("Failed to connect to Alephium node");
      }
      
      setIsConnected(true);
      setMessage("Connected to Alephium blockchain");
      
      toast({
        title: "Connected to Alephium",
        description: "Successfully connected to the Alephium network",
      });
      
      // After connecting, try to load wallet balances
      await loadWalletBalances();
    } catch (error) {
      console.error("Failed to connect to Alephium:", error);
      setMessage(`Failed to connect to Alephium blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      toast({
        title: "Connection Failed",
        description: "Could not connect to Alephium network",
        variant: "destructive",
      });
      
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBalance = (balance: string): string => {
    try {
      // Alephium uses 10^18 as decimals for its native token
      const value = BigInt(balance);
      const formatted = Number(value) / Math.pow(10, 18);
      return formatted.toFixed(4);
    } catch (error) {
      console.error("Error formatting balance:", error);
      return "0.0000";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="dark:bg-[#1E2023] dark:border-[#A0A0A0]/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Alephium Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-[#A0A0A0]">
            Alephium is a sharded blockchain that makes decentralized applications faster, 
            more secure, and less expensive to use. This integration enables you to interact 
            with the Alephium blockchain directly.
          </p>
          
          {!isConnected ? (
            <Button 
              onClick={connectToAlephium}
              className="bg-[#00A3FF] hover:bg-[#00A3FF]/90 text-white"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect to Alephium
            </Button>
          ) : (
            <div className="text-green-500 font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Connected to Alephium
              <Button 
                onClick={loadWalletBalances}
                variant="outline" 
                size="sm" 
                className="ml-2 text-[#00A3FF] hover:text-white hover:bg-[#00A3FF]/90 border-[#00A3FF]"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Refresh Balances
              </Button>
            </div>
          )}
          
          {message && (
            <div className="mt-4 p-3 rounded bg-[#141518] border border-[#A0A0A0]/10 text-[#A0A0A0]">
              {message}
            </div>
          )}
        </CardContent>
      </Card>
      
      {isConnected && balances.length > 0 && (
        <Card className="dark:bg-[#1E2023] dark:border-[#A0A0A0]/20">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Alephium Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {balances.map((balance, index) => (
                <div key={index} className="p-4 rounded-md bg-[#141518] border border-[#A0A0A0]/10">
                  <div className="flex justify-between items-center">
                    <div className="truncate max-w-[70%] text-sm text-[#A0A0A0]">
                      {balance.address}
                    </div>
                    <div className="font-medium text-white">
                      {formatBalance(balance.balance)} ALPH
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-[#A0A0A0]">
                    <div className="flex justify-between">
                      <span>Locked:</span>
                      <span>{formatBalance(balance.lockedBalance)} ALPH</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Total Transactions:</span>
                      <span>{balance.numTxs || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="dark:bg-[#1E2023] dark:border-[#A0A0A0]/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Alephium Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-[#A0A0A0]">
            Learn more about integrating with Alephium blockchain:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[#A0A0A0]">
            <li>
              <a 
                href="https://docs.alephium.org/sdk/getting-started/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#00A3FF] hover:underline"
              >
                Alephium SDK Documentation
              </a>
            </li>
            <li>
              <a 
                href="https://github.com/alephium/alephium-web3" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#00A3FF] hover:underline"
              >
                Alephium Web3 Library
              </a>
            </li>
            <li>
              <a 
                href="https://alephium.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#00A3FF] hover:underline"
              >
                Alephium Official Website
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlephiumSection;
