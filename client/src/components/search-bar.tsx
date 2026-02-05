import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Search, Sparkles, Loader2 } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

const exampleSearches = [
  "Legal engineer, 3+ years",
  "Remote product role",
  "Contract AI specialist",
  "Senior legal tech",
];

export function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const fillExample = (example: string) => {
    setQuery(example);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="bg-card border border-card-border rounded-xl shadow-sm p-5 transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foreground mb-1">AI-Powered Search</h3>
              <p className="text-xs text-muted-foreground">
                Describe your ideal role in natural language
              </p>
            </div>
          </div>
          
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Example: I'm looking for a product manager role with 5-7 years experience, remote work, at a Series A or B startup in legal tech, with a salary around $150K-180K. Interested in contract AI or legal research tools."
            className="min-h-[100px] resize-none text-base border-border focus:border-primary focus:ring-primary/20"
            disabled={isLoading}
            data-testid="input-search"
          />

          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-muted-foreground">
              {query.length} / 500
            </span>
            
            <Button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="gap-2"
              data-testid="button-search"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground mb-3">Try searching:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {exampleSearches.map((example, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => fillExample(example)}
              className="rounded-full text-xs hover:bg-accent hover:border-primary/50 transition-all duration-200"
              data-testid={`button-example-${idx}`}
            >
              {example}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
