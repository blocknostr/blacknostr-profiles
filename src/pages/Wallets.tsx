
import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import WalletManager from "@/components/wallets/WalletManager";
import PortfolioOverview from "@/components/wallets/PortfolioOverview";
import WalletDapps from "@/components/wallets/WalletDapps";
import AlephiumSection from "@/components/wallets/AlephiumSection";
// Import from the correct package
import { AlephiumWalletProvider } from "@alephium/web3-react";

// Define the blockchain ecosystems
type Ecosystem = "bitcoin" | "ethereum" | "alephium";

const Wallets = () => {
  const [selectedEcosystem, setSelectedEcosystem] = useState<Ecosystem>("bitcoin");
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Crypto Portfolio Tracker</h1>
          
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
            <WalletManager ecosystem={selectedEcosystem} />
            
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
    </MainLayout>
  );
};

export default Wallets;
