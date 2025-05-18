
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WalletDappsProps {
  ecosystem: string;
}

const WalletDapps = ({ ecosystem }: WalletDappsProps) => {
  // Ecosystem-specific DApps
  const dapps: Record<string, Array<{ name: string; description: string; url: string }>> = {
    bitcoin: [
      { 
        name: 'Lightning Network',
        description: 'Second layer payment protocol that operates on top of Bitcoin',
        url: 'https://lightning.network/'
      },
      {
        name: 'Stacks',
        description: 'Smart contract platform secured by Bitcoin',
        url: 'https://www.stacks.co/'
      }
    ],
    ethereum: [
      {
        name: 'Uniswap',
        description: 'Decentralized trading protocol on Ethereum',
        url: 'https://uniswap.org/'
      },
      {
        name: 'Aave',
        description: 'Decentralized lending protocol',
        url: 'https://aave.com/'
      }
    ],
    alephium: [
      {
        name: 'Alephium Web Wallet',
        description: 'Official web wallet for Alephium',
        url: 'https://wallet.alephium.org/'
      },
      {
        name: 'Alephium Explorer',
        description: 'Blockchain explorer for Alephium',
        url: 'https://explorer.alephium.org/'
      }
    ]
  };

  const currentDapps = dapps[ecosystem] || [];

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Popular decentralized applications for {ecosystem.charAt(0).toUpperCase() + ecosystem.slice(1)}
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentDapps.map((dapp, index) => (
          <Card key={index} className="dark:bg-black dark:border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">{dapp.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{dapp.description}</p>
              <a 
                href={dapp.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-nostr-blue hover:underline"
              >
                Visit Website
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WalletDapps;
