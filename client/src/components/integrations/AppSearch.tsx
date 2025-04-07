import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface AppSearchProps {
  query: string;
  setQuery: (query: string) => void;
}

const AppSearch: React.FC<AppSearchProps> = ({ query, setQuery }) => {
  return (
    <div className="relative max-w-xl w-full">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search apps by name, category, or description..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10"
      />
    </div>
  );
};

export default AppSearch;
