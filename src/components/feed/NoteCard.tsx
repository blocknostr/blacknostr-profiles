
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
  const { likeNote, repostNote } = useNostr();

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

  // Process content to handle mentions and links according to NIP-08, NIP-10
  const processContent = (content: string) => {
    // For simplicity, we're just returning the raw content here
    // In a full implementation, you would parse and format mentions, links, etc.
    return content;
  };

  const handleLike = async () => {
    try {
      setIsLiked(!isLiked);
      // NIP-25 compliant reaction (kind 7)
      await likeNote(note.id);
      if (!isLiked) {
        toast({
          title: "Note liked",
          description: "Your reaction has been published",
        });
      }
    } catch (error) {
      console.error("Error liking note:", error);
      setIsLiked(isLiked); // Revert state on failure
      toast({
        title: "Failed to like note",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const handleRepost = async () => {
    try {
      setIsReposted(!isReposted);
      // NIP-18 compliant repost (kind 6)
      await repostNote(note.id);
      if (!isReposted) {
        toast({
          title: "Note reposted",
          description: "Your repost has been published",
        });
      }
    } catch (error) {
      console.error("Error reposting note:", error);
      setIsReposted(isReposted); // Revert state on failure
      toast({
        title: "Failed to repost note",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const displayName = authorProfile?.displayName || authorProfile?.name || "Anonymous";
  const username = authorProfile?.npub ? `${authorProfile.npub.substring(0, 8)}...` : "";
  const avatarUrl = authorProfile?.picture || "";

  // Display note creation date
  const timeAgo = formatRelativeTime(note.created_at);

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
                {timeAgo}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="whitespace-pre-wrap">{processContent(note.content)}</p>
      </CardContent>
      <CardFooter className="p-2 pt-0 flex justify-between">
        <Button variant="ghost" size="sm">
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
        <Button variant="ghost" size="sm">
          <Share className="h-4 w-4 mr-1" />
          <span className="text-xs">Share</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
