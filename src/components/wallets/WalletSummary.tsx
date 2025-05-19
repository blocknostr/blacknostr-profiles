
import React, { useEffect, useState, useCallback } from "react"
import { useWallet } from "@alephium/web3-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink } from "lucide-react"
import { publishAlephiumTxToNostr } from "@/lib/nostr"

// —— token‐list interfaces —————————————————————————————————————————————
interface AlephiumTokenMeta {
  id: string
  name: string
  symbol: string
  decimals: number
  logoURI?: string
}

interface NetworkSpecificTokenList {
  networkId: number
  tokens: AlephiumTokenMeta[]
}

interface CombinedTokenListFormat {
  lists: NetworkSpecificTokenList[]
}

// —— balance interfaces —————————————————————————————————————————————
interface TokenBalanceRaw {
  tokenId: string
  balance: string
  lockedBalance: string
}

interface TokenBalance {
  id: string
  balance: string        // raw base‐unit string
  decimals: number
  symbol: string
  name: string
  logoURI?: string
}

interface WalletSummaryPayload {
  address: string
  balances: {
    id: string
    amount: string       // human‐readable
    symbol: string
    name: string
    logoURI?: string
  }[]
}

// Create a simple nostrService to avoid breaking the component
// This uses the existing publishAlephiumTxToNostr function from lib/nostr
const nostrService = {
  publicKey: localStorage.getItem("nostr_public_key") || null,
};

// —— component ————————————————————————————————————————————————————————
export const WalletSummary: React.FC = () => {
  const { account } = useWallet()
  const [balances, setBalances] = useState<TokenBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // publish summary to Nostr (optional)
  const publishWalletSummary = useCallback(
    async (summary: WalletSummaryPayload) => {
      const pubkey = nostrService.publicKey
      if (!pubkey) return
      console.log("[WalletSummary] would publish:", summary)
      // implement sign & publish if you like...
    },
    []
  )

  const fetchBalances = useCallback(
    async (address: string) => {
      setLoading(true)
      setError(null)
      try {
        // 1) raw balances
        const res = await fetch(
          `https://backend.mainnet.alephium.org/addresses/${address}/tokens-balance?page=1&limit=100`
        )
        if (!res.ok) throw new Error(res.statusText)
        const rawData = (await res.json()) as TokenBalanceRaw[]

        // 2) official token list
        const offRes = await fetch(
          "https://raw.githubusercontent.com/alephium/token-list/refs/heads/master/tokens/mainnet.json"
        )
        const offJson: CombinedTokenListFormat = offRes.ok
          ? await offRes.json()
          : { lists: [] }
        const offList = offJson.lists.find((l) => l.networkId === 1)?.tokens || []

        // 3) your custom token list on GitHub "cyxe"
        const customRes = await fetch(
          "https://raw.githubusercontent.com/cyxe/token-list/main/alephium/mainnet.json"
        )
        const customList: AlephiumTokenMeta[] = customRes.ok ? (await customRes.json()).tokens : []

        // build merged map (custom overrides official)
        const tokenMap = new Map<string, AlephiumTokenMeta>()
        offList.forEach((t) => tokenMap.set(t.id, t))
        customList.forEach((t) => tokenMap.set(t.id, t))

        // 4) enrich & format
        const enriched: TokenBalance[] = rawData
          .filter((b) => b.balance !== "0")
          .map(({ tokenId, balance }) => {
            const meta = tokenMap.get(tokenId)
            const decimals = meta?.decimals ?? 0
            return {
              id: tokenId,
              balance,
              decimals,
              symbol: meta?.symbol ?? tokenId.slice(0, 6),
              name: meta?.name ?? "Unknown Token",
              logoURI: meta?.logoURI,
            }
          })

        setBalances(enriched)

        // 5) optionally publish
        if (nostrService.publicKey) {
          const summaryPayload: WalletSummaryPayload = {
            address,
            balances: enriched.map((tok) => {
              const human = Number(tok.balance) / 10 ** tok.decimals
              const amount = human
                .toLocaleString(undefined, {
                  maximumFractionDigits: tok.decimals,
                  minimumFractionDigits: 0,
                })
                .replace(/\.?0+$/, "")
              return {
                id: tok.id,
                amount,
                symbol: tok.symbol,
                name: tok.name,
                logoURI: tok.logoURI,
              }
            }),
          }
          await publishWalletSummary(summaryPayload)
        }
      } catch (err: any) {
        console.error("Failed to fetch balances", err)
        setError(err.message || "Unable to load balances.")
      } finally {
        setLoading(false)
      }
    },
    [publishWalletSummary]
  )

  useEffect(() => {
    if (account?.address) {
      fetchBalances(account.address)
    } else {
      setBalances([])
      setError(null)
      setLoading(false)
    }
  }, [account?.address, fetchBalances])

  if (!account?.address) {
    return (
      <Card className="mt-6 dark:bg-nostr-cardBg dark:border-white/20">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Connect your Alephium wallet to view balances.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-6 dark:bg-nostr-cardBg dark:border-white/20">
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

        {error && <p className="text-sm text-red-500">{error}</p>}

        {!loading && !error && balances.length === 0 && (
          <p className="text-sm text-muted-foreground">No token balances found.</p>
        )}

        {!loading && !error && balances.length > 0 && (
          <div className="space-y-2">
            {balances.map((tok) => {
              const human = Number(tok.balance) / 10 ** tok.decimals
              const formatted = human
                .toLocaleString(undefined, {
                  maximumFractionDigits: tok.decimals,
                  minimumFractionDigits: 0,
                })
                .replace(/\.?0+$/, "")
              return (
                <div
                  key={tok.id}
                  className="flex items-center justify-between border dark:border-white/20 p-2 rounded"
                >
                  <div className="flex items-center gap-3">
                    {tok.logoURI ? (
                      <img
                        src={tok.logoURI}
                        alt={tok.symbol}
                        className="w-6 h-6 rounded"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
                        {tok.symbol.charAt(0)}
                      </div>
                    )}
                    <div className="text-sm">
                      <div className="font-medium">{tok.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {tok.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-mono">{formatted}</div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default WalletSummary;
