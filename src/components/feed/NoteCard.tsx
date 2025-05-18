
import { useState, useEffect } from "react";
import { useNostr } from "@/contexts/NostrContext";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Repeat, Share, Image, Video } from "lucide-react";
import { NostrNote, NostrProfile, formatTimestamp } from "@/lib/nostr";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface MediaContent {
  type: 'image' | 'video';
  url: string;
}

interface NoteCardProps {
  note: NostrNote;
  authorProfile?: NostrProfile;
}

export default function NoteCard({ note, authorProfile }: NoteCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [repostCount, setRepostCount] = useState(0);
  const [replyCount, setReplyCount] = useState(0);
  const [mediaContent, setMediaContent] = useState<MediaContent[]>([]);
  
  const { likeNote, repostNote, replyToNote, checkIfLiked, checkIfReposted, getNoteStats } = useNostr();

  useEffect(() => {
    // Check if the current user has liked or reposted the note
    const checkInteractions = async () => {
      if (note.id) {
        const isLiked = await checkIfLiked(note.id);
        const isReposted = await checkIfReposted(note.id);
        setIsLiked(isLiked);
        setIsReposted(isReposted);
      }
    };

    // Get note stats (likes, reposts, replies count)
    const getStats = async () => {
      if (note.id) {
        const stats = await getNoteStats(note.id);
        setLikeCount(stats.likeCount);
        setRepostCount(stats.repostCount);
        setReplyCount(stats.replyCount);
      }
    };

    // Extract media content from note
    const extractMedia = () => {
      const mediaList: MediaContent[] = [];
      
      // Look for URLs in content
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = note.content.match(urlRegex) || [];
      
      // Check if URLs are media
      urls.forEach(url => {
        if (url.match(/\.(jpeg|jpg|gif|png)$/)) {
          mediaList.push({ type: 'image', url });
        } else if (url.match(/\.(mp4|webm|ogg)$/)) {
          mediaList.push({ type: 'video', url });
        }
      });
      
      // Check note tags for media
      note.tags.forEach(tag => {
        if (tag[0] === 'media' && tag[1]) {
          const url = tag[1];
          const type = tag[2] === 'video' ? 'video' : 'image';
          mediaList.push({ type, url });
        }
      });
      
      setMediaContent(mediaList);
    };

    checkInteractions();
    getStats();
    extractMedia();
  }, [note, checkIfLiked, checkIfReposted, getNoteStats]);

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
    const success = await likeNote(note.id);
    if (success) {
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    }
  };

  const handleRepost = async () => {
    const success = await repostNote(note.id);
    if (success) {
      setIsReposted(!isReposted);
      setRepostCount(prev => isReposted ? prev - 1 : prev + 1);
    }
  };

  const handleReply = async () => {
    await replyToNote(note.id);
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
        
        {mediaContent.length > 0 && (
          <div className="mt-3 space-y-2">
            {mediaContent.map((media, index) => (
              <div key={index} className="rounded-md overflow-hidden">
                {media.type === 'image' ? (
                  <AspectRatio ratio={16 / 9}>
                    <img 
                      src={media.url} 
                      alt="Note attachment" 
                      className="w-full h-full object-cover"
                    />
                  </AspectRatio>
                ) : (
                  <AspectRatio ratio={16 / 9}>
                    <video 
                      src={media.url} 
                      controls
                      className="w-full h-full object-contain"
                    />
                  </AspectRatio>
                )}
              </div>
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
          <span className="text-xs">{replyCount > 0 ? replyCount : ''} Reply</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={isReposted ? "text-green-500" : ""}
          onClick={handleRepost}
        >
          <Repeat className="h-4 w-4 mr-1" />
          <span className="text-xs">{repostCount > 0 ? repostCount : ''} Repost</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={isLiked ? "text-red-500" : ""}
          onClick={handleLike}
        >
          <Heart className="h-4 w-4 mr-1" />
          <span className="text-xs">{likeCount > 0 ? likeCount : ''} Like</span>
        </Button>
        <Button variant="ghost" size="sm">
          <Share className="h-4 w-4 mr-1" />
          <span className="text-xs">Share</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
