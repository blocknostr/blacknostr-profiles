
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { fetchAlephiumData } from '@/lib/coinGeckoAPI';

const AlephiumSection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const connectToAlephium = async () => {
    // This would be replaced with actual Alephium SDK connection logic
    // As per https://docs.alephium.org/sdk/getting-started/
    
    const result = await fetchAlephiumData();
    
    if (result.success) {
      setIsConnected(true);
      setMessage("Connected to Alephium blockchain (simulated)");
    } else {
      setMessage("Failed to connect to Alephium blockchain");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="dark:bg-nostr-dark dark:border-white/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Alephium Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Alephium is a sharded blockchain that makes decentralized applications faster, 
            more secure, and less expensive to use. This integration enables you to interact 
            with the Alephium blockchain directly.
          </p>
          
          {!isConnected ? (
            <Button 
              onClick={connectToAlephium}
              className="bg-nostr-blue hover:bg-nostr-blue/90 text-white"
            >
              Connect to Alephium
            </Button>
          ) : (
            <div className="text-green-500 font-medium">
              ✓ Connected to Alephium
            </div>
          )}
          
          {message && (
            <div className="mt-4 p-3 rounded bg-nostr-dark border border-white/10">
              {message}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="dark:bg-nostr-dark dark:border-white/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Alephium Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Learn more about integrating with Alephium blockchain:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <a 
                href="https://docs.alephium.org/sdk/getting-started/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-nostr-blue hover:underline"
              >
                Alephium SDK Documentation
              </a>
            </li>
            <li>
              <a 
                href="https://github.com/alephium/alephium-web3" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-nostr-blue hover:underline"
              >
                Alephium Web3 Library
              </a>
            </li>
            <li>
              <a 
                href="https://alephium.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-nostr-blue hover:underline"
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
