
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

// Form schema based on NIP-01 metadata fields
const profileFormSchema = z.object({
  name: z.string().max(50, "Name must be 50 characters or less").optional(),
  displayName: z.string().max(50, "Display name must be 50 characters or less").optional(),
  picture: z.string().url("Picture must be a valid URL").optional().or(z.literal('')),
  banner: z.string().url("Banner must be a valid URL").optional().or(z.literal('')),
  about: z.string().max(500, "About must be 500 characters or less").optional(),
  website: z.string().url("Website must be a valid URL").optional().or(z.literal('')),
  nip05: z.string().regex(/^[^@]+@[^@]+\.[^@]+$/, "NIP-05 must be in format user@domain.com").optional().or(z.literal('')),
  lud16: z.string().optional(),
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your NOSTR profile information</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            
            <FormField
              control={form.control}
              name="about"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell the world about yourself..." 
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <FormDescription>Your Lightning address</FormDescription>
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
