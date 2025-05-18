
import { useState } from "react";
import { useNostr } from "@/contexts/NostrContext";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Image, Smile, Video } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function CreateNote() {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { publishNote, profile } = useNostr();

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Empty note",
        description: "Please write something before posting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const success = await publishNote(content);
    setIsSubmitting(false);

    if (success) {
      setContent("");
      toast({
        title: "Note published",
        description: "Your note has been published successfully",
      });
    } else {
      toast({
        title: "Failed to publish note",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex space-x-4">
          <Avatar>
            <AvatarImage src={profile?.picture} alt={profile?.displayName || "User"} />
            <AvatarFallback>{profile?.displayName?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              placeholder="What's happening?"
              className="resize-none border-0 focus-visible:ring-0 p-0 min-h-20"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon">
            <Image className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Smile className="h-5 w-5" />
          </Button>
        </div>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          className="nostr-button-primary"
        >
          Post
        </Button>
      </CardFooter>
    </Card>
  );
}
