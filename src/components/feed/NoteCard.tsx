
import { useState, useEffect } from "react";
import { useNostr } from "@/contexts/NostrContext";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Repeat, Share } from "lucide-react";
import { NostrNote, NostrProfile, formatTimestamp } from "@/lib/nostr";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NoteCardProps {
  note: NostrNote;
  authorProfile?: NostrProfile;
}

export default function NoteCard({ note, authorProfile }: NoteCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [stats, setStats] = useState({ likes: 0, replies: 0, reposts: 0 });
  const { likeNote, repostNote, checkIfLiked, checkIfReposted, getNoteStats } = useNostr();

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

  useEffect(() => {
    const loadNoteStatus = async () => {
      const liked = await checkIfLiked(note.id);
      const reposted = await checkIfReposted(note.id);
      setIsLiked(liked);
      setIsReposted(reposted);
      
      const noteStats = await getNoteStats(note.id);
      if (noteStats) {
        setStats({
          likes: noteStats.likes,
          replies: noteStats.replies,
          reposts: noteStats.reposts
        });
      }
    };
    
    loadNoteStatus();
  }, [note.id, checkIfLiked, checkIfReposted, getNoteStats]);

  const handleLike = async () => {
    const success = await likeNote(note.id);
    if (success) {
      setIsLiked(!isLiked);
      setStats(prev => ({
        ...prev,
        likes: isLiked ? prev.likes - 1 : prev.likes + 1
      }));
    }
  };

  const handleRepost = async () => {
    const success = await repostNote(note.id);
    if (success) {
      setIsReposted(!isReposted);
      setStats(prev => ({
        ...prev,
        reposts: isReposted ? prev.reposts - 1 : prev.reposts + 1
      }));
    }
  };

  const handleReply = async () => {
    // Reply functionality will be implemented later
    console.log("Reply to:", note.id);
  };

  const displayName = authorProfile?.displayName || authorProfile?.name || "Anonymous";
  const username = authorProfile?.npub ? `${authorProfile.npub.substring(0, 8)}...` : "";
  const avatarUrl = authorProfile?.picture || "";

  // Parse content for media (images, videos, etc.) - NIP-23 compliance
  const { content, mediaItems } = parseContent(note.content);

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
        <p className="whitespace-pre-wrap break-words">{content}</p>

        {mediaItems.length > 0 && (
          <div className="mt-3 max-h-96 overflow-hidden rounded-md">
            <ScrollArea className="h-full w-full">
              {mediaItems.map((media, index) => (
                <RenderMedia key={index} media={media} />
              ))}
            </ScrollArea>
          </div>
        )}

        {note.tags.length > 0 && hasHashtags(note.tags) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {extractHashtags(note.tags).map((tag, i) => (
              <span key={i} className="text-xs bg-muted px-2 py-1 rounded-full text-primary">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-2 pt-0 flex justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleReply}
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          <span className="text-xs">{stats.replies > 0 ? stats.replies : ""}</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={isReposted ? "text-green-500" : ""}
          onClick={handleRepost}
        >
          <Repeat className="h-4 w-4 mr-1" />
          <span className="text-xs">{stats.reposts > 0 ? stats.reposts : ""}</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={isLiked ? "text-red-500" : ""}
          onClick={handleLike}
        >
          <Heart className="h-4 w-4 mr-1" />
          <span className="text-xs">{stats.likes > 0 ? stats.likes : ""}</span>
        </Button>
        <Button variant="ghost" size="sm">
          <Share className="h-4 w-4 mr-1" />
          <span className="text-xs"></span>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Helper function to parse content and extract media URLs
function parseContent(content: string): { content: string; mediaItems: MediaItem[] } {
  const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|mp3|wav))/gi;
  const mediaItems: MediaItem[] = [];
  let matches;
  let lastIndex = 0;
  let processedContent = content;
  
  // Find all media URLs in the content
  while ((matches = urlRegex.exec(content)) !== null) {
    const url = matches[0];
    const type = getMediaType(url);
    
    if (type !== 'unknown') {
      mediaItems.push({ url, type });
      // Remove the URL from the content to avoid displaying it twice
      processedContent = processedContent.replace(url, '');
    }
  }
  
  return { content: processedContent.trim(), mediaItems };
}

type MediaType = 'image' | 'video' | 'audio' | 'unknown';

interface MediaItem {
  url: string;
  type: MediaType;
}

function getMediaType(url: string): MediaType {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
    return 'image';
  } else if (['mp4', 'webm', 'mov'].includes(extension)) {
    return 'video';
  } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
    return 'audio';
  }
  
  return 'unknown';
}

function RenderMedia({ media }: { media: MediaItem }) {
  switch (media.type) {
    case 'image':
      return (
        <img 
          src={media.url} 
          alt="Media content" 
          className="max-w-full rounded-md" 
          loading="lazy"
        />
      );
    case 'video':
      return (
        <video 
          src={media.url} 
          controls 
          className="max-w-full rounded-md" 
          preload="metadata"
        />
      );
    case 'audio':
      return (
        <audio 
          src={media.url} 
          controls 
          className="w-full" 
          preload="metadata"
        />
      );
    default:
      return null;
  }
}

function hasHashtags(tags: string[][]): boolean {
  return tags.some(tag => tag[0] === 't');
}

function extractHashtags(tags: string[][]): string[] {
  return tags
    .filter(tag => tag[0] === 't' && tag[1])
    .map(tag => tag[1]);
}
