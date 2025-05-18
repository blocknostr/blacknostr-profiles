
import React, { useState } from 'react';
import { useNostr } from '@/contexts/NostrContext';
import { useTheme } from '@/contexts/ThemeContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { Settings as SettingsIcon, Trash2, Wifi, Link, Moon, Sun } from 'lucide-react';
import { DEFAULT_RELAYS } from '@/lib/nostr';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const formSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL starting with wss://" }).startsWith('wss://', { message: "NOSTR relays must use wss:// protocol" }),
  read: z.boolean().default(true),
  write: z.boolean().default(true),
});

type RelayFormValues = z.infer<typeof formSchema>;

export default function Settings() {
  const { relays, addRelay, removeRelay, updateRelay, saveRelaysToStorage } = useNostr();
  const { theme, setTheme } = useTheme();
  const [isAddingRelay, setIsAddingRelay] = useState(false);

  const form = useForm<RelayFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: 'wss://',
      read: true,
      write: true,
    },
  });

  const onSubmit = (data: RelayFormValues) => {
    addRelay(data.url, data.read, data.write);
    form.reset();
    setIsAddingRelay(false);
  };

  const resetToDefaults = () => {
    // First remove all current relays
    relays.forEach(relay => {
      removeRelay(relay.url);
    });
    
    // Then add default relays
    DEFAULT_RELAYS.forEach(relay => {
      addRelay(relay.url, relay.read, relay.write);
    });
    
    toast({
      title: 'Reset to defaults',
      description: 'Your relays have been reset to the default list',
    });
  };

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center">
          <SettingsIcon className="mr-2" /> Settings
        </h1>

        {/* Theme Settings */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              {theme === "dark" ? <Moon className="mr-2" /> : <Sun className="mr-2" />} Appearance
            </CardTitle>
            <CardDescription>
              Customize how BlockNostr looks for you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="theme-mode" className="text-base font-medium">Theme Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Choose between light, dark, or system theme
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wifi className="mr-2" /> NOSTR Relays
            </CardTitle>
            <CardDescription>
              Manage the relays you connect to for reading and publishing NOSTR content.
              According to NIP-01, clients should maintain a list of relays with read/write capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* List of current relays */}
              {relays.length > 0 ? (
                <div className="border rounded-md">
                  <div className="grid grid-cols-12 bg-muted p-3 rounded-t-md">
                    <div className="col-span-6 font-medium">URL</div>
                    <div className="col-span-2 font-medium text-center">Read</div>
                    <div className="col-span-2 font-medium text-center">Write</div>
                    <div className="col-span-2 font-medium text-center">Actions</div>
                  </div>
                  {relays.map((relay, index) => (
                    <React.Fragment key={relay.url}>
                      {index > 0 && <Separator />}
                      <div className="grid grid-cols-12 p-3 items-center">
                        <div className="col-span-6 truncate" title={relay.url}>
                          {relay.url}
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <Checkbox 
                            checked={relay.read} 
                            onCheckedChange={(checked) => {
                              updateRelay(relay.url, checked === true, relay.write);
                            }} 
                          />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <Checkbox 
                            checked={relay.write}
                            onCheckedChange={(checked) => {
                              updateRelay(relay.url, relay.read, checked === true);
                            }}
                          />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeRelay(relay.url)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border rounded-md bg-muted/10">
                  No relays configured. Add a relay to get started.
                </div>
              )}

              {/* Add new relay form */}
              {isAddingRelay ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Relay</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Relay URL</FormLabel>
                              <FormControl>
                                <Input placeholder="wss://" {...field} />
                              </FormControl>
                              <FormDescription>
                                Enter a valid WebSocket URL starting with wss://
                              </FormDescription>
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="read"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-md border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Read</FormLabel>
                                  <FormDescription>
                                    Allow fetching notes from this relay
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="write"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-md border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Write</FormLabel>
                                  <FormDescription>
                                    Allow publishing notes to this relay
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setIsAddingRelay(false);
                              form.reset();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">Add Relay</Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              ) : (
                <Button onClick={() => setIsAddingRelay(true)}>
                  Add New Relay
                </Button>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
            <Button onClick={saveRelaysToStorage}>
              Save Changes
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Link className="mr-2" /> NIP Compliance
            </CardTitle>
            <CardDescription>
              This application implements the following NIPs (NOSTR Implementation Possibilities)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-6 space-y-2">
              <li>NIP-01: Basic protocol flow description</li>
              <li>NIP-02: Contact List and Petnames</li>
              <li>NIP-05: Mapping NOSTR keys to DNS-based internet identifiers</li>
              <li>NIP-10: On "e" and "p" tags in Text Events</li>
              <li>NIP-19: bech32-encoded entities</li>
              <li>NIP-25: Reactions</li>
              <li>NIP-36: Sensitive Content</li>
              <li>NIP-42: Authentication of clients to relays</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
