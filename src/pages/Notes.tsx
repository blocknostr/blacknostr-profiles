
import MainLayout from "@/components/layout/MainLayout";
import NoteFeed from "@/components/feed/NoteFeed";
import CreateNote from "@/components/feed/CreateNote";
import { Button } from "@/components/ui/button";
import { useNostr } from "@/contexts/NostrContext";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

const Notes = () => {
  const { isAuthenticated, publishNote } = useNostr();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    if (!noteContent.trim()) {
      toast({
        title: "Empty note",
        description: "Please write something before publishing",
        variant: "destructive"
      });
      return;
    }

    setIsPublishing(true);
    try {
      const success = await publishNote(noteContent);
      if (success) {
        toast({
          title: "Note published successfully",
          description: "Your note has been published to the Nostr network"
        });
        setNoteContent("");
        setDialogOpen(false);
      } else {
        toast({
          title: "Failed to publish note",
          description: "Please check your connection and try again",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error publishing note:", error);
      toast({
        title: "Error occurred",
        description: "An error occurred while publishing your note",
        variant: "destructive"
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Notes</h1>
          {isAuthenticated && (
            <Button 
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-1"
            >
              <PlusCircle className="h-4 w-4" />
              Create Note
            </Button>
          )}
        </div>

        {isAuthenticated && <CreateNote />}
        <NoteFeed />
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md md:max-w-xl">
            <DialogHeader>
              <DialogTitle>Create New Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea 
                placeholder="What's on your mind? Write your note here..."
                className="min-h-[200px] p-4"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handlePublish}
                  disabled={isPublishing || !noteContent.trim()}
                >
                  {isPublishing ? "Publishing..." : "Publish Note"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Notes;
