
import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useNostr } from "@/contexts/NostrContext";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Heart, Repeat, MessageSquare, UserPlus } from "lucide-react";
import { formatTimestamp } from "@/lib/nostr";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

type NotificationType = "like" | "repost" | "mention" | "reply" | "follow";

// Interface following NIP-01 event structure with additional fields for UI
interface Notification {
  id: string;
  pubkey: string;
  type: NotificationType;
  created_at: number;
  content: string;
  noteId?: string; // For likes, reposts, mentions, replies
  read: boolean;
  user?: {
    name?: string;
    picture?: string;
  };
}

const NotificationIcon = ({ type }: { type: NotificationType }) => {
  switch (type) {
    case "like":
      return <Heart className="h-5 w-5 text-red-500" />;
    case "repost":
      return <Repeat className="h-5 w-5 text-green-500" />;
    case "mention":
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case "reply":
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case "follow":
      return <UserPlus className="h-5 w-5 text-purple-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

const NotificationMessage = ({ notification }: { notification: Notification }) => {
  switch (notification.type) {
    case "like":
      return <span><strong>{notification.user?.name || "Someone"}</strong> liked your note</span>;
    case "repost":
      return <span><strong>{notification.user?.name || "Someone"}</strong> reposted your note</span>;
    case "mention":
      return <span><strong>{notification.user?.name || "Someone"}</strong> mentioned you in a note</span>;
    case "reply":
      return <span><strong>{notification.user?.name || "Someone"}</strong> replied to your note</span>;
    case "follow":
      return <span><strong>{notification.user?.name || "Someone"}</strong> followed you</span>;
    default:
      return <span>New notification</span>;
  }
};

const Notifications = () => {
  const { isAuthenticated, pool, publicKey, relays, fetchProfile } = useNostr();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isAuthenticated || !publicKey || !pool) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch notifications based on NIP-01 events
        // This implementation focuses on likes (kind 7), reposts (kind 6), and mentions (kind 1 with p tag)
        const events = await pool.list(
          relays.filter(r => r.read).map(r => r.url),
          [
            // Reactions to user's notes (likes) - Kind 7 as per NIP-25
            {
              kinds: [7],
              "#p": [publicKey],
              limit: 20,
            },
            // Reposts of user's notes - Kind 6 (Repost) as per NIP-18
            {
              kinds: [6],
              "#p": [publicKey],
              limit: 20,
            },
            // Mentions in notes - Kind 1 with p tag containing user's pubkey
            {
              kinds: [1],
              "#p": [publicKey],
              limit: 20,
            }
          ]
        );
        
        // Process the events into notifications
        const notificationPromises = events.map(async (event) => {
          try {
            // Fetch profile of the author
            const profile = await fetchProfile(event.pubkey);
            
            let type: NotificationType;
            let noteId: string | undefined;
            
            // Determine notification type based on event kind
            if (event.kind === 7) {
              type = "like";
              // Extract note ID from e tag
              noteId = event.tags.find(tag => tag[0] === "e")?.[1];
            } else if (event.kind === 6) {
              type = "repost";
              // Extract note ID from e tag
              noteId = event.tags.find(tag => tag[0] === "e")?.[1];
            } else if (event.kind === 1) {
              // Check if it's a reply or just a mention
              const replyTag = event.tags.find(tag => tag[0] === "e");
              type = replyTag ? "reply" : "mention";
              noteId = event.id;
            } else {
              // Default case
              type = "mention";
            }
            
            return {
              id: event.id,
              pubkey: event.pubkey,
              type,
              created_at: event.created_at,
              content: event.content,
              noteId,
              read: false, // All notifications start as unread
              user: {
                name: profile?.displayName || profile?.name,
                picture: profile?.picture,
              },
            };
          } catch (error) {
            console.error("Error processing notification:", error);
            return null;
          }
        });
        
        // Fixed type predicate to correctly check for non-null Notification objects
        const processedNotifications = (await Promise.all(notificationPromises))
          .filter((n): n is Notification => n !== null)
          .sort((a, b) => b.created_at - a.created_at);
        
        setNotifications(processedNotifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        toast({
          title: "Error fetching notifications",
          description: "Could not retrieve your notifications",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Optional: Set up real-time subscriptions for new notifications
    const setupSubscriptions = () => {
      if (!pool || !publicKey) return;
      
      // Subscribe to new likes, reposts, and mentions in real-time
      const sub = pool.sub(
        relays.filter(r => r.read).map(r => r.url),
        [
          {
            kinds: [7], // Likes
            "#p": [publicKey],
            since: Math.floor(Date.now() / 1000), // Only new events
          },
          {
            kinds: [6], // Reposts
            "#p": [publicKey],
            since: Math.floor(Date.now() / 1000),
          },
          {
            kinds: [1], // Notes with mentions
            "#p": [publicKey],
            since: Math.floor(Date.now() / 1000),
          }
        ]
      );

      sub.on('event', async (event) => {
        try {
          const profile = await fetchProfile(event.pubkey);
          
          let type: NotificationType;
          let noteId: string | undefined;
          
          if (event.kind === 7) {
            type = "like";
            noteId = event.tags.find(tag => tag[0] === "e")?.[1];
          } else if (event.kind === 6) {
            type = "repost";
            noteId = event.tags.find(tag => tag[0] === "e")?.[1];
          } else if (event.kind === 1) {
            const replyTag = event.tags.find(tag => tag[0] === "e");
            type = replyTag ? "reply" : "mention";
            noteId = event.id;
          } else {
            type = "mention";
          }
          
          const newNotification: Notification = {
            id: event.id,
            pubkey: event.pubkey,
            type,
            created_at: event.created_at,
            content: event.content,
            noteId,
            read: false,
            user: {
              name: profile?.displayName || profile?.name,
              picture: profile?.picture,
            },
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          
          // Show a toast for the new notification
          toast({
            title: "New notification",
            description: `${profile?.displayName || "Someone"} ${type === "like" ? "liked" : type === "repost" ? "reposted" : type === "reply" ? "replied to" : "mentioned you in"} a note`,
          });
        } catch (error) {
          console.error("Error processing real-time notification:", error);
        }
      });

      return () => {
        sub.unsub();
      };
    };

    const cleanup = setupSubscriptions();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [isAuthenticated, publicKey, pool, relays, fetchProfile]);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {notifications.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {notifications.filter(n => !n.read).length} unread
            </Badge>
          )}
        </div>
        
        <Separator className="my-4" />
        
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-md w-full" />
              ))}
            </div>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <Card 
                key={notification.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${!notification.read ? 'border-l-4 border-l-blue-500' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={notification.user?.picture} alt={notification.user?.name || "User"} />
                      <AvatarFallback>
                        {notification.user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <NotificationIcon type={notification.type} />
                        <div className="font-medium">
                          <NotificationMessage notification={notification} />
                        </div>
                      </div>
                      {notification.type !== "follow" && notification.content && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {notification.content}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {formatTimestamp(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !isAuthenticated ? (
          <div className="text-center p-8">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">Sign in to see your notifications</p>
            <p className="text-muted-foreground">Connect your wallet to view notifications</p>
          </div>
        ) : (
          <div className="text-center p-8">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No notifications yet</p>
            <p className="text-muted-foreground">When someone interacts with your posts, you'll see it here</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Notifications;
