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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark, atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge } from "@/components/ui/badge";

// Supported languages
const LANGUAGES = [
  { value: "plain", label: "Plain Text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "markdown", label: "Markdown" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" },
  { value: "shell", label: "Shell" },
];

export default function NoteBin() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("plain");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedNoteId, setPublishedNoteId] = useState<string | null>(null);
  const [noteIdToFetch, setNoteIdToFetch] = useState("");
  const [fetchedNote, setFetchedNote] = useState<{id: string; content: string; title?: string; language?: string} | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const { theme } = useTheme();

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
      // Add title and language as tags (compliant with NIP-23)
      const tags = [];
      if (title) tags.push(["title", title]);
      if (language && language !== "plain") tags.push(["l", language]);
      
      const noteId = await publishNote(content, tags);
      
      if (noteId) {
        setPublishedNoteId(noteId);
        toast({
          title: "Note published",
          description: "Your note has been published successfully",
        });
        setContent("");
        setTitle("");
        setLanguage("plain");
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
        
        // Find language tag if it exists (NIP-23)
        const languageTag = note.tags.find(tag => tag[0] === "l");
        const language = languageTag ? languageTag[1] : "plain";
        
        setFetchedNote({
          id: note.id,
          content: note.content,
          title,
          language
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

  // Get the correct syntax highlighting style based on theme
  const syntaxStyle = theme === "dark" ? atomOneDark : atomOneLight;

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
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <CardTitle className="flex items-center justify-between">
                <span>{fetchedNote.title || "Untitled Note"}</span>
                {fetchedNote.language && fetchedNote.language !== "plain" && (
                  <Badge className="text-xs" variant="outline">
                    {LANGUAGES.find(l => l.value === fetchedNote.language)?.label || fetchedNote.language}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fetchedNote.language && fetchedNote.language !== "plain" ? (
                <SyntaxHighlighter
                  language={fetchedNote.language}
                  style={syntaxStyle}
                  className="rounded-md text-sm"
                  customStyle={{
                    padding: '1rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                  }}
                >
                  {fetchedNote.content}
                </SyntaxHighlighter>
              ) : (
                <pre className="whitespace-pre-wrap bg-secondary p-4 rounded-md overflow-x-auto font-mono text-sm">
                  {fetchedNote.content}
                </pre>
              )}
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
                    setLanguage(fetchedNote.language || "plain");
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
