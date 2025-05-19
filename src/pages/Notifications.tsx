
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { formatTimestamp } from "@/lib/nostr";
import { Heart, MessageSquare, Repeat, UserPlus } from "lucide-react";
import { useNostr } from "@/contexts/NostrContext";

// Define explicit notification types that match what we'll filter for
type NotificationType = "like" | "repost" | "mention" | "reply" | "follow";

interface Notification {
  id: string;
  pubkey: string;
  type: NotificationType;
  created_at: number;
  content: string;
  noteId?: string;
  read: boolean;
  user: {
    name: string;
    picture: string;
  };
}

const Notifications = () => {
  const { publicKey } = useNostr();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, we would fetch actual notifications from NOSTR relays
    // For now, we'll simulate some notifications
    const fetchNotifications = async () => {
      setIsLoading(true);
      
      // Simulate API call delay
      setTimeout(() => {
        const demoNotifications: Notification[] = [
          {
            id: "1",
            pubkey: "pubkey1",
            type: "like",
            created_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
            content: "liked your note",
            noteId: "note1",
            read: false,
            user: {
              name: "John Doe",
              picture: "https://github.com/shadcn.png",
            }
          },
          {
            id: "2",
            pubkey: "pubkey2",
            type: "repost",
            created_at: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
            content: "reposted your note",
            noteId: "note2",
            read: false,
            user: {
              name: "Jane Smith",
              picture: "https://github.com/shadcn.png",
            }
          },
          {
            id: "3",
            pubkey: "pubkey3",
            type: "mention",
            created_at: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
            content: "mentioned you in a note",
            noteId: "note3",
            read: true,
            user: {
              name: "Alex Johnson",
              picture: "https://github.com/shadcn.png",
            }
          },
          {
            id: "4",
            pubkey: "pubkey4",
            type: "reply",
            created_at: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
            content: "replied to your note: Thanks for sharing this!",
            noteId: "note4",
            read: true,
            user: {
              name: "Sam Williams",
              picture: "https://github.com/shadcn.png",
            }
          },
          {
            id: "5",
            pubkey: "pubkey5",
            type: "follow",
            created_at: Math.floor(Date.now() / 1000) - 259200, // 3 days ago
            content: "followed you",
            read: true,
            user: {
              name: "Taylor Green",
              picture: "https://github.com/shadcn.png",
            }
          }
        ];
        
        setNotifications(demoNotifications);
        setIsLoading(false);
      }, 1000);
    };
    
    fetchNotifications();
  }, []);

  // Format relative time (e.g. "2h ago")
  const formatRelativeTime = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    if (diff < 2592000) return `${Math.floor(diff / 604800)}w`;

    return formatTimestamp(timestamp);
  };

  // Correctly type-safe filter function that ensures type compatibility
  const getNotificationsByType = (type: NotificationType) => {
    return notifications.filter((notif): notif is Notification => notif.type === type);
  };

  const renderNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "like":
        return <Heart className="h-4 w-4 text-red-500" />;
      case "repost":
        return <Repeat className="h-4 w-4 text-green-500" />;
      case "reply":
      case "mention":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "follow":
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <MainLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <div className="bg-accent p-2 rounded-lg">
            <p className="text-sm">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-muted"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-[200px] rounded bg-muted"></div>
                      <div className="h-3 w-[150px] rounded bg-muted"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={notification.read ? "opacity-80" : "border-blue-500"}
                >
                  <CardContent className="p-4 flex items-start space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={notification.user.picture} alt={notification.user.name} />
                      <AvatarFallback>{notification.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {renderNotificationIcon(notification.type)}
                        <p className="text-sm">
                          <span className="font-medium">{notification.user.name}</span>
                          {" "}{notification.content}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Notifications;
