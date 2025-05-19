import React, { useEffect, useState, useCallback } from "react";
import { useWallet } from "@alephium/web3-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";
import { nostrService } from "@/lib/nostr";
import { Event, getEventHash } from "nostr-tools"; // Ensure Event is imported

// Helper interface for the structure of individual network-specific token lists
interface NetworkSpecificTokenList {
    name: string;
    networkId: number;
    tokens: AlephiumTokenMeta[];
    logoURI?: string; // Optional, as it might not be used directly from here
    keywords?: string[]; // Optional
}

// Helper interface for the root structure of the combined token list file
interface CombinedTokenListFormat {
    name?: string; // Optional root properties
    timestamp?: string; // Optional
    lists: NetworkSpecificTokenList[];
    // other root properties can be added if needed
}

interface TokenBalance {
    id: string
    balance: string       // raw base-unit string
    decimals: number      // always defined after enrichment
    symbol: string        // always defined after enrichment
    name: string          // always defined after enrichment
    logoURI?: string
}

interface AlephiumTokenMeta {
    id: string
    name: string
    symbol: string
    decimals: number
    logoURI?: string
}

interface WalletSummaryPayload {
    address: string
    balances: {
        id: string
        amount: string       // human-readable string
        symbol: string
        name: string
        logoURI?: string
    }[]
}

const WalletSummary: React.FC = () => {
    const { account } = useWallet();
    const [balances, setBalances] = useState<TokenBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const publishWalletSummary = useCallback(
        async (summary: WalletSummaryPayload) => {
            const pubkey = nostrService.publicKey;
            if (!pubkey) return;
            // Use Partial<Event> for the event object before signing
            const nostrEvent: Partial<Event> = {
                kind: 30000,
                created_at: Math.floor(Date.now() / 1000),
                pubkey,
                tags: [["d", "wallet-summary"]],
                content: JSON.stringify(summary),
            };

            // The following lines are commented out to prevent potential errors
            // if nostrService.signEvent or .publish are not available or have different signatures.
            // Re-enable and test carefully if your nostrService is expected to handle these.
            // nostrEvent.id = getEventHash(nostrEvent as Event);
            // try {
            //   nostrEvent.sig = await nostrService.signEvent(nostrEvent as Event);
            //   await nostrService.publish(nostrEvent as Event);
            //   console.log("[WalletSummary] Wallet summary published to Nostr:", nostrEvent);
            // } catch (e) {
            //   console.error("[WalletSummary] Failed to sign or publish Nostr event:", e);
            // }
            console.log("[WalletSummary] Nostr event creation (publishing part is commented out):", nostrEvent);
        },
        []
    );

    const fetchBalances = useCallback(
        async (address: string) => {
            setLoading(true);
            setError(null);
            try {
                // 1) Fetch raw balances array
                const res = await fetch(
                    `https://backend.mainnet.alephium.org/addresses/${address}/tokens-balance?page=1&limit=100`
                );
                if (!res.ok) throw new Error(res.statusText);
                const data = await res.json() as Array<{ tokenId: string; balance: string; lockedBalance: string }>;
                console.log("[WalletSummary] Raw balances API data:", data);

                // 2) Fetch the combined token list file from raw.githubusercontent.com
                const listRes = await fetch(
                    "https://raw.githubusercontent.com/alephium/token-list/refs/heads/master/tokens/mainnet.json" // Corrected URL for the combined token list
                );
                const listJson: CombinedTokenListFormat = listRes.ok ? await listRes.json() : { lists: [] };
                console.log("[WalletSummary] Raw combined token list data (contains multiple lists):", listJson);

                // Extract the mainnet token list (assuming networkId 1 is mainnet)
                const mainnetTokenListData = listJson.lists?.find(list => list.networkId === 1);

                let tokensForMap: AlephiumTokenMeta[] = [];
                if (mainnetTokenListData) {
                    tokensForMap = mainnetTokenListData.tokens || [];
                    console.log(`[WalletSummary] Extracted ${tokensForMap.length} tokens from the mainnet list (networkId 1) named "${mainnetTokenListData.name}".`);
                } else {
                    console.warn("[WalletSummary] Mainnet token list (networkId 1) not found within the fetched combined list. Token information might be incomplete or use fallbacks.");
                }

                // 3) Build a lookup map from the extracted mainnet tokens
                const tokenMap = new Map<string, AlephiumTokenMeta>(
                    tokensForMap.map((t: AlephiumTokenMeta) => [t.id, t])
                );

                // 4) Enrich + filter out zero balances
                const enriched: TokenBalance[] = data
                    .filter((item) => item.balance !== "0")
                    .map((item) => {
                        const meta = tokenMap.get(item.tokenId);
                        let decimals, symbol, name, logoURI;

                        if (meta) {
                            decimals = meta.decimals;
                            symbol = meta.symbol;
                            name = meta.name;
                            logoURI = meta.logoURI;
                        } else {
                            // Log a warning if metadata is not found for a token in the extracted mainnet list
                            console.warn(`[WalletSummary] Metadata not found for token ID: ${item.tokenId} in the extracted mainnet token data. Using fallback values (decimals: 0, name: "Unknown Token"). Source: alephium.tokenlist.json (networkId: 1 section)`);
                            decimals = 0;
                            symbol = item.tokenId.slice(0, 6);
                            name = "Unknown Token";
                            logoURI = undefined;
                        }

                        return {
                            id: item.tokenId,
                            balance: item.balance,
                            decimals,
                            symbol,
                            name,
                            logoURI,
                        };
                    });

                console.log("[WalletSummary] Enriched balances (after parsing mainnet list):", enriched);
                setBalances(enriched);

                // 5) Publish the human-readable summary on Nostr
                if (nostrService.publicKey) {
                    const summaryPayload: WalletSummaryPayload = {
                        address,
                        balances: enriched.map(tok => {
                            // divide by 10**decimals and format
                            const humanValue =
                                Number(tok.balance) / 10 ** tok.decimals;
                            const formatted = humanValue.toLocaleString(undefined, {
                                maximumFractionDigits: tok.decimals,
                            });
                            return {
                                id: tok.id,
                                amount: formatted,
                                symbol: tok.symbol,
                                name: tok.name,
                                logoURI: tok.logoURI,
                            };
                        })
                    };
                    await publishWalletSummary(summaryPayload);
                }
            } catch (err) { // Changed from err: any
                const errorMessage = err instanceof Error ? err.message : "Unable to load balances.";
                console.error("Failed to fetch balances", err);
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        },
        [publishWalletSummary]
    );

    useEffect(() => {
        if (account?.address) {
            fetchBalances(account.address);
        } else {
            setBalances([]);
            setError(null);
            setLoading(false);
        }
    }, [account?.address, fetchBalances]);

    // Render when wallet not connected
    if (!account?.address) {
        return (
            <Card className="mt-6">
                <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                        Connect your Alephium wallet to view balances.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="mt-6">
            <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Alephium Wallet Summary</h2>
                    <a
                        href={`https://explorer.alephium.org/addresses/${account.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center"
                    >
                        View on Explorer <ExternalLink className="ml-1 h-4 w-4" />
                    </a>
                </div>

                {loading && (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full rounded" />
                        ))}
                    </div>
                )}

                {error && (
                    <p className="text-sm text-red-500">{error}</p>
                )}

                {!loading && !error && balances.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        No token balances found.
                    </p>
                )}

                {!loading && !error && balances.length > 0 && (
                    <div className="space-y-2">
                        {balances.map(tok => {
                            // convert & format for display
                            const humanValue = Number(tok.balance) / 10 ** tok.decimals;
                            const formatted = humanValue.toLocaleString(undefined, {
                                maximumFractionDigits: tok.decimals,
                            });
                            return (
                                <div
                                    key={tok.id}
                                    className="flex items-center justify-between border p-2 rounded"
                                >
                                    <div className="flex items-center gap-3">
                                        {tok.logoURI ? (
                                            <img
                                                src={tok.logoURI}
                                                alt={tok.symbol}
                                                className="w-6 h-6 rounded"
                                            />
                                        ) : (
                                            <div className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center text-xs text-gray-600">
                                                {tok.symbol.charAt(0)}
                                            </div>
                                        )}
                                        <div className="text-sm">
                                            <div className="font-medium">
                                                {tok.symbol}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {tok.name}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-mono">{formatted}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default WalletSummary;
