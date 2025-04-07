import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Interface for app metadata
export interface IntegrationApp {
  id: string;
  name: string;
  iconUrl: string;
  backgroundColor: string;
  description: string;
  category: string;
  authMethod: string;
  badges: string[];
  configFields: {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    description?: string;
    placeholder?: string;
  }[];
  webhookSupport?: boolean;
  availableTriggers?: {
    id: string;
    name: string;
    type: string;
    schema?: Record<string, any>;
  }[];
  availableActions?: {
    id: string;
    name: string;
    type: string;
    requiredParams?: {
      name: string;
      type: string;
    }[];
  }[];
  docsUrl?: string;
  setupInstructions?: string;
}

interface AddAppViewProps {
  onSelectApp: (app: IntegrationApp) => void;
}

const AddAppView = ({ onSelectApp }: AddAppViewProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch available apps
  const { data: availableApps, isLoading, error } = useQuery({
    queryKey: ["/api/integrations/available-apps"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/integrations/available-apps");
        const json = await response.json();
        
        if (json && json.success && json.data) {
          console.log("API response:", json.data.length, "apps found");
          return json.data as IntegrationApp[];
        }
        
        console.error("Invalid API response structure:", json);
        return []; // Return empty array instead of throwing
      } catch (err) {
        console.error("Error fetching available apps:", err);
        return []; // Return empty array on error
      }
    },
  });

  // Handle search and category filtering
  const filteredApps = availableApps?.filter((app) => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? app.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories from available apps
  const categories = Array.from(
    new Set(availableApps?.map((app) => app.category) || [])
  ).sort();

  // Handle app selection
  const handleAppSelect = (app: IntegrationApp) => {
    onSelectApp(app);
  };

  // Handle errors with useEffect to prevent render-time side effects
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading integrations",
        description: "Failed to load available integrations. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search apps..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Badge>
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredApps?.map((app) => (
            <div
              key={app.id}
              className="border rounded-lg hover:shadow-md transition-all cursor-pointer overflow-hidden hover:border-primary group relative"
              onClick={() => handleAppSelect(app)}
            >
              {/* Badge overlay for Coming Soon apps */}
              {app.badges.includes("Coming Soon") && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                  <Badge className="bg-yellow-500 text-white border-0 px-3 py-1.5 text-sm">
                    Coming Soon
                  </Badge>
                </div>
              )}
              
              {/* App header with icon */}
              <div 
                className="h-20 p-4 flex items-center gap-4" 
                style={{ 
                  backgroundColor: app.backgroundColor || "#f3f4f6",
                  opacity: app.badges.includes("Coming Soon") ? 0.7 : 1
                }}
              >
                <div className="w-12 h-12 rounded-md bg-white shadow-sm flex items-center justify-center">
                  <img 
                    src={app.iconUrl} 
                    alt={app.name}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/32x32/cccccc/969696?text=' + app.name.charAt(0);
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate drop-shadow-sm">{app.name}</h3>
                  <div className="flex items-center mt-1">
                    <Badge 
                      variant="secondary" 
                      className="bg-white/20 text-white border-0 text-xs font-normal"
                    >
                      {app.category}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* App details */}
              <div className="p-4 bg-white">
                <div className="flex flex-wrap gap-1 mb-2">
                  {app.badges.filter(badge => badge !== "Coming Soon").map((badge, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className={cn(
                        "text-[10px] py-0 h-5",
                        badge === "Core" && "bg-primary/10 text-primary border-primary/20",
                        badge === "Verified" && "bg-green-50 text-green-700 border-green-200",
                        badge === "Required" && "bg-amber-50 text-amber-700 border-amber-200",
                        badge === "Built-in" && "bg-blue-50 text-blue-700 border-blue-200",
                      )}
                    >
                      {badge}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{app.description}</p>
              </div>
              
              {/* Connect button on hover */}
              <div className="px-4 py-3 border-t flex items-center justify-between bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  {app.authMethod === 'oauth2' || app.authMethod === 'ghl-oauth' 
                    ? 'OAuth Connection' 
                    : app.authMethod === 'apikey' || app.authMethod === 'ghl-apikey'
                    ? 'API Key'
                    : app.authMethod === 'webhook'
                    ? 'Webhook'
                    : 'No Auth Required'}
                </span>
                <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Connect →
                </span>
              </div>
            </div>
          ))}
          
          {(filteredApps?.length === 0) && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground">
              <p>No integrations found for "{searchQuery}"</p>
              {selectedCategory && (
                <p className="text-sm mt-1">Try removing the "{selectedCategory}" category filter</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddAppView;