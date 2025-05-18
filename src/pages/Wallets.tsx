
import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PortfolioOverview from "@/components/wallets/PortfolioOverview";
import WalletDapps from "@/components/wallets/WalletDapps";
import AlephiumSection from "@/components/wallets/AlephiumSection";
import { AlephiumWalletProvider, useWallet } from "@alephium/web3-react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import WalletDialog from "@/components/wallets/WalletDialog";

// Define the blockchain ecosystems
type Ecosystem = "bitcoin" | "ethereum" | "alephium";

const Wallets = () => {
  const [selectedEcosystem, setSelectedEcosystem] = useState<Ecosystem>("bitcoin");
  
  // Check if Alephium wallet is connected
  const AlephiumWalletDetector = () => {
    const { connectionStatus, account } = useWallet();
    
    useEffect(() => {
      if (connectionStatus === 'connected' && account) {
        const walletAddress = account.address;
        
        // If Alephium wallet is connected, set the selected ecosystem to Alephium
        setSelectedEcosystem("alephium");
        
        // Save the connected wallet address to localStorage for tracking
        const savedWallets = localStorage.getItem(`alephium_wallets`);
        const wallets = savedWallets ? JSON.parse(savedWallets) : [];
        
        // Check if wallet is already in the list
        if (!wallets.some((w: any) => w.address === walletAddress)) {
          const newWallet = { id: Date.now().toString(), address: walletAddress };
          const updatedWallets = [...wallets, newWallet];
          localStorage.setItem('alephium_wallets', JSON.stringify(updatedWallets));
          
          toast({
            title: "Wallet Connected",
            description: "Your Alephium wallet has been added to your portfolio tracker.",
          });
        }
      }
    }, [connectionStatus, account]);
    
    return null; // This component doesn't render anything
  };
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Crypto Portfolio Tracker</h1>
          
          <div className="flex items-center gap-4">
            {/* Ecosystem Selector */}
            <Select value={selectedEcosystem} onValueChange={(value) => setSelectedEcosystem(value as Ecosystem)}>
              <SelectTrigger className="w-[180px] dark:bg-nostr-dark dark:border-white/20">
                <SelectValue placeholder="Select Blockchain" />
              </SelectTrigger>
              <SelectContent className="dark:bg-nostr-cardBg dark:border-white/20">
                <SelectItem value="bitcoin">Bitcoin</SelectItem>
                <SelectItem value="ethereum">Ethereum</SelectItem>
                <SelectItem value="alephium">Alephium</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Wallet Manager Dialog */}
            <WalletDialog ecosystem={selectedEcosystem}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="dark:bg-nostr-dark dark:border-white/20">
                  <Settings className="h-5 w-5" />
                </Button>
              </DialogTrigger>
            </WalletDialog>
          </div>
        </div>

        <Card className="dark:bg-nostr-cardBg dark:border-white/20">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              {selectedEcosystem === "bitcoin" ? "Bitcoin" : 
               selectedEcosystem === "ethereum" ? "Ethereum" : 
               "Alephium"} Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="portfolio" className="mt-6">
              <TabsList className="dark:bg-nostr-dark dark:text-white mb-4">
                <TabsTrigger value="portfolio" className="data-[state=active]:dark:bg-nostr-blue data-[state=active]:dark:text-white">My Portfolio</TabsTrigger>
                <TabsTrigger value="dapps" className="data-[state=active]:dark:bg-nostr-blue data-[state=active]:dark:text-white">My Dapps</TabsTrigger>
                {selectedEcosystem === "alephium" && 
                 <TabsTrigger value="alephium" className="data-[state=active]:dark:bg-nostr-blue data-[state=active]:dark:text-white">My Alephium</TabsTrigger>}
              </TabsList>
              
              <TabsContent value="portfolio">
                <PortfolioOverview ecosystem={selectedEcosystem} />
              </TabsContent>
              
              <TabsContent value="dapps">
                <WalletDapps ecosystem={selectedEcosystem} />
              </TabsContent>
              
              {selectedEcosystem === "alephium" && (
                <TabsContent value="alephium">
                  <AlephiumWalletProvider network="mainnet">
                    <AlephiumSection />
                  </AlephiumWalletProvider>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Wrap this detector in the provider so it can detect wallet connection */}
      <AlephiumWalletProvider network="mainnet">
        <AlephiumWalletDetector />
      </AlephiumWalletProvider>
    </MainLayout>
  );
};

export default Wallets;
