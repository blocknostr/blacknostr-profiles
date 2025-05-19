
import { useState } from "react";
import { useNostr } from "@/contexts/NostrContext";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nip19 } from "nostr-tools";
import { Skeleton } from "@/components/ui/skeleton";

export default function NoteBin() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedNoteId, setPublishedNoteId] = useState<string | null>(null);
  const [noteIdToFetch, setNoteIdToFetch] = useState("");
  const [fetchedNote, setFetchedNote] = useState<{id: string; content: string; title?: string} | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const { publishNote, fetchSingleNote, isAuthenticated } = useNostr();

  const handlePublish = async () => {
    if (!content.trim()) {
      toast({
        title: "Empty note",
        description: "Please write something before publishing",
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to publish notes",
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);

    try {
      // Add title as a tag if provided
      const tags = title ? [["title", title]] : [];
      const noteId = await publishNote(content, tags);
      
      if (noteId) {
        setPublishedNoteId(noteId);
        toast({
          title: "Note published",
          description: "Your note has been published successfully",
        });
        setContent("");
        setTitle("");
      } else {
        toast({
          title: "Failed to publish note",
          description: "Please try again later",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error publishing note:", error);
      toast({
        title: "Error",
        description: "An error occurred while publishing",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleFetch = async () => {
    if (!noteIdToFetch.trim()) {
      toast({
        title: "Missing note ID",
        description: "Please enter a valid note ID",
        variant: "destructive",
      });
      return;
    }

    setIsFetching(true);
    
    try {
      // Handle both hex and bech32 note IDs (per NIP-19)
      let hexId = noteIdToFetch;
      
      if (noteIdToFetch.startsWith("note1")) {
        try {
          const { data } = nip19.decode(noteIdToFetch);
          hexId = data as string;
        } catch (error) {
          throw new Error("Invalid note ID format");
        }
      }
      
      const note = await fetchSingleNote(hexId);
      
      if (note) {
        // Find title tag if it exists
        const titleTag = note.tags.find(tag => tag[0] === "title");
        const title = titleTag ? titleTag[1] : undefined;
        
        setFetchedNote({
          id: note.id,
          content: note.content,
          title
        });
      } else {
        toast({
          title: "Note not found",
          description: "Could not find a note with that ID",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching note:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while fetching the note",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Copied to clipboard" });
  };

  return (
    <Tabs defaultValue="create" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="create">Create Note</TabsTrigger>
        <TabsTrigger value="get">Get Note</TabsTrigger>
      </TabsList>
      
      <TabsContent value="create" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Create a New Note</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  placeholder="Enter a title for your note"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Write your note here..."
                  className="min-h-[300px] font-mono"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setContent("")}>Clear</Button>
            <Button onClick={handlePublish} disabled={isPublishing || !content.trim()}>
              {isPublishing ? "Publishing..." : "Publish Note"}
            </Button>
          </CardFooter>
        </Card>
        
        {publishedNoteId && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Published!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Note ID (Hex)</Label>
                  <div className="flex mt-1">
                    <Input readOnly value={publishedNoteId} />
                    <Button 
                      variant="outline" 
                      className="ml-2"
                      onClick={() => copyToClipboard(publishedNoteId)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Note ID (Bech32)</Label>
                  <div className="flex mt-1">
                    <Input readOnly value={nip19.noteEncode(publishedNoteId)} />
                    <Button 
                      variant="outline" 
                      className="ml-2"
                      onClick={() => copyToClipboard(nip19.noteEncode(publishedNoteId))}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
      
      <TabsContent value="get" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Get a Note</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="noteId">Note ID</Label>
                <div className="flex">
                  <Input
                    id="noteId"
                    placeholder="Enter note ID (hex or bech32)"
                    value={noteIdToFetch}
                    onChange={(e) => setNoteIdToFetch(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    className="ml-2" 
                    onClick={handleFetch}
                    disabled={isFetching || !noteIdToFetch.trim()}
                  >
                    Fetch
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {isFetching ? (
          <Card className="mt-4">
            <CardContent className="p-4">
              <Skeleton className="h-6 w-1/3 mb-4" />
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ) : fetchedNote && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{fetchedNote.title || "Untitled Note"}</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap bg-secondary p-4 rounded-md overflow-x-auto font-mono text-sm">
                {fetchedNote.content}
              </pre>
            </CardContent>
            <CardFooter>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => copyToClipboard(fetchedNote.content)}
                >
                  Copy Content
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setContent(fetchedNote.content);
                    setTitle(fetchedNote.title || "");
                    setNoteIdToFetch("");
                    setFetchedNote(null);
                    document.querySelector('[value="create"]')?.dispatchEvent(new Event('click'));
                  }}
                >
                  Edit Note
                </Button>
              </div>
            </CardFooter>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
