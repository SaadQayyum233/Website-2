import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppListItem from "./AppListItem";
import { PackageSearch } from "lucide-react";

interface AppData {
  id: string;
  name: string;
  iconUrl: string;
  backgroundColor: string;
  type: string;
  description: string;
  category: string;
  badges: string[];
  configurationFields: any[];
}

interface AppListProps {
  apps: AppData[];
  isLoading: boolean;
  onAppClick: (app: AppData) => void;
  connectedApps: string[];
}

const AppList: React.FC<AppListProps> = ({ 
  apps, 
  isLoading, 
  onAppClick,
  connectedApps 
}) => {
  // Get unique categories
  const categories = Array.from(new Set(apps.map(app => app.category)));
  
  return (
    <div>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-12 border rounded-md bg-muted/10">
          <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
          <h3 className="text-lg font-medium mb-1">No apps found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or check back later for new integrations.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Apps</TabsTrigger>
            {categories.map(category => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.map(app => (
                <AppListItem 
                  key={app.id} 
                  app={app} 
                  onClick={() => onAppClick(app)}
                  isConnected={connectedApps.includes(app.id)}
                />
              ))}
            </div>
          </TabsContent>
          
          {categories.map(category => (
            <TabsContent key={category} value={category} className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {apps
                  .filter(app => app.category === category)
                  .map(app => (
                    <AppListItem 
                      key={app.id} 
                      app={app} 
                      onClick={() => onAppClick(app)} 
                      isConnected={connectedApps.includes(app.id)}
                    />
                  ))
                }
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default AppList;
