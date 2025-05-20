
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { NostrProfile } from "@/lib/nostr";
import { useNostr } from "@/contexts/NostrContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { 
  Link, 
  DollarSign, 
  Coins, 
  Contact, 
  Globe, 
  Layers, 
  User,
  Image,
  FileText,
  Zap
} from "lucide-react";

// Form schema based on NIP-01 metadata fields with new cryptocurrency fields
const profileFormSchema = z.object({
  // Basic profile fields
  name: z.string().max(50, "Name must be 50 characters or less").optional(),
  displayName: z.string().max(50, "Display name must be 50 characters or less").optional(),
  picture: z.string().url("Picture must be a valid URL").optional().or(z.literal('')),
  banner: z.string().url("Banner must be a valid URL").optional().or(z.literal('')),
  about: z.string().max(500, "About must be 500 characters or less").optional(),
  
  // Identity fields
  website: z.string().url("Website must be a valid URL").optional().or(z.literal('')),
  nip05: z.string().regex(/^[^@]+@[^@]+\.[^@]+$/, "NIP-05 must be in format user@domain.com").optional().or(z.literal('')),
  lud16: z.string().optional(),
  
  // Cryptocurrency fields
  coingeckoUrl: z.string().url("Coingecko URL must be a valid URL").optional().or(z.literal('')),
  marketCap: z.string().optional(),
  fullyDilutedValuation: z.string().optional(),
  tradingVolume24h: z.string().optional(),
  circulatingSupply: z.string().optional(),
  totalSupply: z.string().optional(),
  maxSupply: z.string().optional(),
  
  // Project links
  contact: z.string().optional(),
  sourceCode: z.string().url("Source code URL must be a valid URL").optional().or(z.literal('')),
  apiId: z.string().optional(),
  
  // Arrays
  explorers: z.string().optional().transform(val => val ? val.split(',').map(item => item.trim()) : []),
  communities: z.string().optional().transform(val => val ? val.split(',').map(item => item.trim()) : []),
  chains: z.string().optional().transform(val => val ? val.split(',').map(item => item.trim()) : []),
  categories: z.string().optional().transform(val => val ? val.split(',').map(item => item.trim()) : []),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditProfileDialog: React.FC<EditProfileDialogProps> = ({ open, onOpenChange }) => {
  const { profile, updateProfile, isAuthenticated } = useNostr();
  
  // Initialize the form with current profile values
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: profile?.name || "",
      displayName: profile?.displayName || "",
      picture: profile?.picture || "",
      banner: profile?.banner || "",
      about: profile?.about || "",
      website: profile?.website || "",
      nip05: profile?.nip05 || "",
      lud16: profile?.lud16 || "",
      // Cryptocurrency fields
      coingeckoUrl: profile?.coingeckoUrl || "",
      marketCap: profile?.marketCap || "",
      fullyDilutedValuation: profile?.fullyDilutedValuation || "",
      tradingVolume24h: profile?.tradingVolume24h || "",
      circulatingSupply: profile?.circulatingSupply || "",
      totalSupply: profile?.totalSupply || "",
      maxSupply: profile?.maxSupply || "",
      contact: profile?.contact || "",
      sourceCode: profile?.sourceCode || "",
      apiId: profile?.apiId || "",
      // Array fields converted to comma-separated strings for form editing
      explorers: profile?.explorers?.join(', ') || "",
      communities: profile?.communities?.join(', ') || "",
      chains: profile?.chains?.join(', ') || "",
      categories: profile?.categories?.join(', ') || "",
    },
  });

  // Reset form values when profile changes or dialog opens
  useEffect(() => {
    if (profile && open) {
      form.reset({
        name: profile.name || "",
        displayName: profile.displayName || "",
        picture: profile.picture || "",
        banner: profile.banner || "",
        about: profile.about || "",
        website: profile.website || "",
        nip05: profile.nip05 || "",
        lud16: profile.lud16 || "",
        // Cryptocurrency fields
        coingeckoUrl: profile.coingeckoUrl || "",
        marketCap: profile.marketCap || "",
        fullyDilutedValuation: profile.fullyDilutedValuation || "",
        tradingVolume24h: profile.tradingVolume24h || "",
        circulatingSupply: profile.circulatingSupply || "",
        totalSupply: profile.totalSupply || "",
        maxSupply: profile.maxSupply || "",
        contact: profile.contact || "",
        sourceCode: profile.sourceCode || "",
        apiId: profile.apiId || "",
        // Array fields converted to comma-separated strings for form editing
        explorers: profile.explorers?.join(', ') || "",
        communities: profile.communities?.join(', ') || "",
        chains: profile.chains?.join(', ') || "",
        categories: profile.categories?.join(', ') || "",
      });
    }
  }, [profile, form, open]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!profile) return;
    
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to update your profile",
        variant: "destructive"
      });
      return;
    }
    
    // Create updated profile object
    const updatedProfile: NostrProfile = {
      ...profile,
      ...values,
    };
    
    // Update profile
    const success = await updateProfile(updatedProfile);
    
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your NOSTR profile information</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Identity Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center">
                <User className="mr-2 h-5 w-5" />
                Basic Information
              </h3>
              <Separator />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="username" {...field} />
                    </FormControl>
                    <FormDescription>Your username on NOSTR</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Display Name" {...field} />
                    </FormControl>
                    <FormDescription>Name displayed to others</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Images Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center">
                <Image className="mr-2 h-5 w-5" />
                Images
              </h3>
              <Separator />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="picture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Picture URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                    </FormControl>
                    <FormDescription>URL to your profile picture</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="banner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banner Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/banner.jpg" {...field} />
                    </FormControl>
                    <FormDescription>URL to your banner image</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* About Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                About
              </h3>
              <Separator />
            </div>
            
            <FormField
              control={form.control}
              name="about"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell the world about yourself or your project..." 
                      rows={4} 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>Your bio (max 500 characters)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Contact and Verification Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center">
                <Contact className="mr-2 h-5 w-5" />
                Contact & Verification
              </h3>
              <Separator />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://yourwebsite.com" {...field} />
                    </FormControl>
                    <FormDescription>Your personal website</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input placeholder="contact@example.com" {...field} />
                    </FormControl>
                    <FormDescription>Public contact information</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nip05"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIP-05 Identifier</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormDescription>Your NIP-05 verification</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lud16"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lightning Address</FormLabel>
                    <FormControl>
                      <Input placeholder="you@wallet.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      <div className="flex items-center">
                        <Zap className="h-3.5 w-3.5 mr-1" />
                        <span>Your Lightning address for payments</span>
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Market Data Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Market Data
              </h3>
              <Separator />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="coingeckoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coingecko URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.coingecko.com/en/coins/..." {...field} />
                    </FormControl>
                    <FormDescription>Link to CoinGecko page</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apiId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API ID</FormLabel>
                    <FormControl>
                      <Input placeholder="bitcoin" {...field} />
                    </FormControl>
                    <FormDescription>ID used in API calls</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="marketCap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market Cap</FormLabel>
                    <FormControl>
                      <Input placeholder="$10,000,000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fullyDilutedValuation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fully Diluted Valuation</FormLabel>
                    <FormControl>
                      <Input placeholder="$20,000,000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tradingVolume24h"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>24 Hour Trading Volume</FormLabel>
                    <FormControl>
                      <Input placeholder="$1,500,000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Supply Data Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center">
                <Coins className="mr-2 h-5 w-5" />
                Supply Information
              </h3>
              <Separator />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="circulatingSupply"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Circulating Supply</FormLabel>
                    <FormControl>
                      <Input placeholder="18,000,000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalSupply"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Supply</FormLabel>
                    <FormControl>
                      <Input placeholder="21,000,000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxSupply"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Supply</FormLabel>
                    <FormControl>
                      <Input placeholder="21,000,000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Links Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center">
                <Link className="mr-2 h-5 w-5" />
                Links
              </h3>
              <Separator />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sourceCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Code</FormLabel>
                    <FormControl>
                      <Input placeholder="https://github.com/..." {...field} />
                    </FormControl>
                    <FormDescription>Link to source code repository</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="explorers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Explorers</FormLabel>
                    <FormControl>
                      <Input placeholder="https://explorer1.com, https://explorer2.com" {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated list of blockchain explorers</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="communities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Communities</FormLabel>
                    <FormControl>
                      <Input placeholder="Discord, Telegram, Reddit, etc." {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated list of community links</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Classification Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center">
                <Layers className="mr-2 h-5 w-5" />
                Classification
              </h3>
              <Separator />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="chains"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chains</FormLabel>
                    <FormControl>
                      <Input placeholder="Ethereum, Solana, Bitcoin, etc." {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated list of blockchain networks</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categories</FormLabel>
                    <FormControl>
                      <Input placeholder="DeFi, NFT, Gaming, etc." {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated list of project categories</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="submit" 
                className="mr-2"
                disabled={!isAuthenticated}
              >
                Save Changes
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </DialogFooter>
            
            {!isAuthenticated && (
              <div className="text-center text-destructive text-sm mt-2">
                You must be logged in to update your profile
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
