import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

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

interface AppListItemProps {
  app: AppData;
  onClick: () => void;
  isConnected: boolean;
}

const AppListItem: React.FC<AppListItemProps> = ({ app, onClick, isConnected }) => {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md border",
        isConnected && "border-primary/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div 
            className="rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: app.backgroundColor || '#e2e8f0' }}
          >
            {app.iconUrl ? (
              <img src={app.iconUrl} alt={app.name} className="w-7 h-7" />
            ) : (
              <span className="text-white font-semibold text-lg">{app.name.charAt(0)}</span>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium text-base truncate">{app.name}</h3>
              {isConnected && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
            </div>
            
            <div className="flex flex-wrap gap-1 mb-2">
              {app.badges.map((badge, index) => (
                <Badge 
                  key={index} 
                  variant={
                    badge === 'Verified' ? 'default' : 
                    badge === 'Core' ? 'destructive' : 
                    badge === 'Required' ? 'destructive' : 
                    'outline'
                  }
                  className="text-xs"
                >
                  {badge}
                </Badge>
              ))}
              <Badge variant="outline" className="text-xs">{app.category}</Badge>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {app.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppListItem;
