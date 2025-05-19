
import { useState, useEffect } from "react";
import { useNostr } from "@/contexts/NostrContext";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nip19 } from "nostr-tools";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark, atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge } from "@/components/ui/badge";
import { NostrNote } from "@/lib/nostr";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [archivedNotes, setArchivedNotes] = useState<{id: string; content: string; title?: string; language?: string; created_at: number}[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [fetchedNote, setFetchedNote] = useState<{id: string; content: string; title?: string; language?: string} | null>(null);
  const { theme } = useTheme();

  const { publishNote, fetchNotes, fetchSingleNote, isAuthenticated } = useNostr();

  // Fetch archived notes when component mounts or tab changes
  useEffect(() => {
    const loadArchivedNotes = async () => {
      setIsLoadingArchive(true);
      try {
        const notes = await fetchNotes();
        
        // Filter and format notes to find NIP-23 "notebin" notes (looking for language tags)
        const notebinNotes = notes
          .filter(note => {
            // Check if this note has a language tag, which indicates it's a notebin note
            return note.tags.some(tag => tag[0] === "l");
          })
          .map(note => {
            // Get title and language from tags if they exist
            const titleTag = note.tags.find(tag => tag[0] === "title");
            const languageTag = note.tags.find(tag => tag[0] === "l");
            
            return {
              id: note.id,
              content: note.content,
              title: titleTag ? titleTag[1] : undefined,
              language: languageTag ? languageTag[1] : "plain",
              created_at: note.created_at
            };
          })
          .sort((a, b) => b.created_at - a.created_at); // Sort by newest first
          
        setArchivedNotes(notebinNotes);
      } catch (error) {
        console.error("Error loading archived notes:", error);
        toast({
          title: "Error",
          description: "Failed to load archived notes",
          variant: "destructive",
        });
      } finally {
        setIsLoadingArchive(false);
      }
    };

    loadArchivedNotes();
  }, [fetchNotes, publishedNoteId]); // Also reload when a new note is published

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

  const handleViewNote = async (noteId: string) => {
    try {
      const note = await fetchSingleNote(noteId);
      
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
      }
    } catch (error) {
      console.error("Error fetching note:", error);
      toast({
        title: "Error",
        description: "An error occurred while fetching the note",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Copied to clipboard" });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Get the correct syntax highlighting style based on theme
  const syntaxStyle = theme === "dark" ? atomOneDark : atomOneLight;

  return (
    <Tabs defaultValue="create" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="create">Create Note</TabsTrigger>
        <TabsTrigger value="archive">Archive</TabsTrigger>
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
      
      <TabsContent value="archive" className="mt-4">
        {fetchedNote ? (
          <div className="space-y-4">
            <Button 
              variant="outline"
              onClick={() => setFetchedNote(null)}
              className="mb-4"
            >
              Back to Archive
            </Button>
            
            <Card>
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
                      setFetchedNote(null);
                      document.querySelector('[value="create"]')?.dispatchEvent(new Event('click'));
                    }}
                  >
                    Edit Note
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Notes</h2>
            
            {isLoadingArchive ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="hover:bg-accent/5 transition-colors">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-24 w-full" />
                      <div className="mt-2">
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : archivedNotes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No notes found. Create a note to get started!</p>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {archivedNotes.map((note) => (
                  <Card 
                    key={note.id} 
                    className="hover:bg-accent/5 transition-colors cursor-pointer" 
                    onClick={() => handleViewNote(note.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span className="truncate">{note.title || "Untitled Note"}</span>
                        {note.language && note.language !== "plain" && (
                          <Badge className="text-xs" variant="outline">
                            {LANGUAGES.find(l => l.value === note.language)?.label || note.language}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="line-clamp-3 text-sm text-muted-foreground font-mono">
                        {note.content}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {formatDate(note.created_at)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
