
import { useState } from "react";
import { useNostr } from "@/contexts/NostrContext";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Repeat, Share } from "lucide-react";
import { NostrNote, NostrProfile, formatTimestamp } from "@/lib/nostr";
import { toast } from "@/components/ui/use-toast";

interface NoteCardProps {
  note: NostrNote;
  authorProfile?: NostrProfile;
}

export default function NoteCard({ note, authorProfile }: NoteCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const { likeNote, repostNote, isAuthenticated } = useNostr();

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

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to like notes",
        variant: "destructive"
      });
      return;
    }

    setIsLiked(!isLiked);
    await likeNote(note.id);
  };

  const handleRepost = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to repost notes",
        variant: "destructive"
      });
      return;
    }

    setIsReposted(!isReposted);
    await repostNote(note.id);
  };

  const handleReply = () => {
    toast({
      title: "Coming soon",
      description: "Reply functionality will be available soon",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Shared via BlockNostr',
        text: note.content,
        url: `nostr:note:${note.id}`,
      }).catch((error) => console.error('Error sharing:', error));
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(`nostr:note:${note.id}`);
      toast({
        title: "Link copied",
        description: "Note link copied to clipboard",
      });
    }
  };

  const displayName = authorProfile?.displayName || authorProfile?.name || "Anonymous";
  const username = authorProfile?.npub ? `${authorProfile.npub.substring(0, 8)}...` : "";
  const avatarUrl = authorProfile?.picture || "";

  return (
    <Card className="mb-4 hover:bg-accent/5 transition-colors">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start space-x-3">
          <Avatar>
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">{displayName}</p>
                <p className="text-xs text-muted-foreground">{username}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(note.created_at)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="whitespace-pre-wrap">{note.content}</p>
      </CardContent>
      <CardFooter className="p-2 pt-0 flex justify-between">
        <Button variant="ghost" size="sm" onClick={handleReply}>
          <MessageSquare className="h-4 w-4 mr-1" />
          <span className="text-xs">Reply</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={isReposted ? "text-green-500" : ""}
          onClick={handleRepost}
        >
          <Repeat className="h-4 w-4 mr-1" />
          <span className="text-xs">Repost</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={isLiked ? "text-red-500" : ""}
          onClick={handleLike}
        >
          <Heart className="h-4 w-4 mr-1" />
          <span className="text-xs">Like</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleShare}>
          <Share className="h-4 w-4 mr-1" />
          <span className="text-xs">Share</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
