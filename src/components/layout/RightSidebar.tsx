
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function RightSidebar() {
  return (
    <div className="h-screen w-80 p-4 border-l border-border hidden md:block">
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search NOSTR..."
          className="pl-8"
        />
      </div>

      {/* Who to follow */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Who to follow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div>
                  <p className="text-sm font-medium">User {i}</p>
                  <p className="text-xs text-muted-foreground">@user{i}</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Follow</Button>
            </div>
          ))}
          
          <Button variant="ghost" size="sm" className="w-full text-nostr-primary">
            Show more
          </Button>
        </CardContent>
      </Card>

      {/* Trending */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Trending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {["#bitcoin", "#nostr", "#decentralization", "#privacy"].map(tag => (
              <div key={tag} className="pb-2 border-b border-border cursor-pointer hover:bg-muted/50 rounded px-2">
                <p className="font-medium text-sm">{tag}</p>
                <p className="text-xs text-muted-foreground">1,234 notes</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
