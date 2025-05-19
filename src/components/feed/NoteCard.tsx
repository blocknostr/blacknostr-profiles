
import { useState } from "react";
import { useNostr } from "@/contexts/NostrContext";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Repeat, Share } from "lucide-react";
import { NostrNote, NostrProfile, formatTimestamp } from "@/lib/nostr";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NoteCardProps {
  note: NostrNote;
  authorProfile?: NostrProfile;
}

export default function NoteCard({ note, authorProfile }: NoteCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const { likeNote, repostNote, followUser } = useNostr();

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
      setIsLiked(true);
    }
  };

  const handleRepost = async () => {
    const success = await repostNote(note.id);
    if (success) {
      setIsReposted(true);
    }
  };

  const handleFollow = async () => {
    if (!authorProfile) return;
    await followUser(authorProfile.pubkey);
  };

  const displayName = authorProfile?.displayName || authorProfile?.name || "Anonymous";
  const username = authorProfile?.npub ? `${authorProfile.npub.substring(0, 8)}...` : "";
  const avatarUrl = authorProfile?.picture || "";

  // Process content for display - handle links, hashtags, mentions
  const processContent = (content: string) => {
    // Replace URLs with clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let processedContent = content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>');
    
    // Replace hashtags with clickable links
    const hashtagRegex = /(#\w+)/g;
    processedContent = processedContent.replace(hashtagRegex, '<span class="text-blue-500 hover:underline">$1</span>');
    
    // Replace mentions with clickable links
    const mentionRegex = /(@\w+)/g;
    processedContent = processedContent.replace(mentionRegex, '<span class="text-blue-500 hover:underline">$1</span>');
    
    return processedContent;
  };

  return (
    <Card className="mb-4 hover:bg-accent/5 transition-colors dark:bg-nostr-cardBg">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start space-x-3">
          <Avatar>
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{displayName}</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs text-muted-foreground hover:bg-primary/10"
                          onClick={handleFollow}
                        >
                          Follow
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Follow this user</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
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
        <div 
          className="whitespace-pre-wrap" 
          dangerouslySetInnerHTML={{ __html: processContent(note.content) }} 
        />
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
