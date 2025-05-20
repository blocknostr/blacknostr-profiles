
import { useState } from "react";
import { useNostr } from "@/contexts/NostrContext";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Repeat, Link } from "lucide-react";
import { NostrNote, NostrProfile, formatTimestamp } from "@/lib/nostr";
import { nip19 } from "nostr-tools";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  const handleLike = async () => {
    setIsLiked(!isLiked);
    await likeNote(note.id);
  };

  const handleRepost = async () => {
    setIsReposted(!isReposted);
    await repostNote(note.id);
  };

  // NIP-19: Generate bech32-encoded note ID
  const noteId = note.nip19Id || nip19.noteEncode(note.id);
  
  // NIP-19: Generate bech32-encoded profile ID
  const profileId = authorProfile?.npub || (authorProfile?.pubkey ? nip19.npubEncode(authorProfile.pubkey) : "");
  
  const displayName = authorProfile?.displayName || authorProfile?.name || "Anonymous";
  const username = profileId ? `${profileId.substring(0, 8)}...` : "";
  const avatarUrl = authorProfile?.picture || "";

  // NIP-10: Check for replies (any 'e' tag indicates this is a reply)
  const isReply = note.tags.some(tag => tag[0] === 'e');
  const replyToId = isReply ? note.tags.find(tag => tag[0] === 'e')?.[1] : null;
  
  // Process content for mentions - NIP-08, NIP-27
  const processContent = (content: string) => {
    // Process nostr: URI scheme (NIP-27)
    const nostrUriRegex = /(nostr:)([a-zA-Z0-9]+)/g;
    content = content.replace(nostrUriRegex, '<a href="$1$2" class="text-primary hover:underline">$1$2</a>');
    
    // Process #[0] style mentions (NIP-08)
    const mentionRegex = /#\[(\d+)\]/g;
    content = content.replace(mentionRegex, (match, index) => {
      const tagIndex = parseInt(index);
      if (note.tags.length > tagIndex) {
        const tag = note.tags[tagIndex];
        if (tag[0] === 'p') {
          return `<a href="/profile/${tag[1]}" class="text-primary hover:underline">@${tag[1].substring(0, 6)}...</a>`;
        } else if (tag[0] === 'e') {
          return `<a href="/note/${tag[1]}" class="text-primary hover:underline">note:${tag[1].substring(0, 6)}...</a>`;
        }
      }
      return match;
    });
    
    return content;
  };

  const copyNoteLink = () => {
    // NIP-19: Use noteId for shareable links
    navigator.clipboard.writeText(`nostr:${noteId}`);
    alert("Note link copied to clipboard");
  };

  return (
    <Card className="mb-4 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {username}
                  {/* NIP-05 verification display */}
                  {authorProfile?.nip05 && (
                    <span className="ml-1 text-green-500">✓</span>
                  )}
                </p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(note.created_at)}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{new Date(note.created_at * 1000).toLocaleString()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {/* Show reply information if applicable (NIP-10) */}
        {isReply && replyToId && (
          <div className="text-xs text-muted-foreground mb-2">
            <span>Replying to note: {replyToId.substring(0, 8)}...</span>
          </div>
        )}
        
        {/* Content with processed mentions and links */}
        <div 
          className="whitespace-pre-wrap text-base leading-relaxed" 
          dangerouslySetInnerHTML={{ __html: processContent(note.content) }} 
        />
      </CardContent>
      <CardFooter className="p-3 pt-0 flex justify-between border-t border-gray-100 dark:border-gray-800 mt-2">
        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-primary hover:bg-primary/5">
          <MessageSquare className="h-4 w-4 mr-1" />
          <span className="text-xs">Reply</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={isReposted ? "text-green-500" : "text-gray-500 hover:text-green-500 hover:bg-green-500/5"}
          onClick={handleRepost}
        >
          <Repeat className="h-4 w-4 mr-1" />
          <span className="text-xs">Repost</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500 hover:bg-red-500/5"}
          onClick={handleLike}
        >
          <Heart className="h-4 w-4 mr-1" />
          <span className="text-xs">Like</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-gray-500 hover:text-primary hover:bg-primary/5" 
          onClick={copyNoteLink}
        >
          <Link className="h-4 w-4 mr-1" />
          <span className="text-xs">Copy</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
