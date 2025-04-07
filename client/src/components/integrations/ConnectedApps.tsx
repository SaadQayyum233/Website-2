import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  RefreshCcw, 
  MoreVertical,
  Settings,
  Link as LinkIcon
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface IntegrationConnection {
  id: number;
  provider: string;
  name: string;
  iconUrl?: string;
  backgroundColor?: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  config: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  last_tested?: string | null;
  last_test_success?: boolean;
}

interface ConnectedAppsProps {
  onEditIntegration: (connection: IntegrationConnection) => void;
}

export default function ConnectedApps({ onEditIntegration }: ConnectedAppsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectionToDelete, setConnectionToDelete] = useState<IntegrationConnection | null>(null);
  
  // Get all user's connections
  const { data: connections, isLoading, error } = useQuery({
    queryKey: ["/api/integrations/connections"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/integrations/connections");
        const json = await response.json();
        
        if (json && json.success && json.data) {
          console.log("API response:", json.data.length, "connections found");
          return json.data as IntegrationConnection[];
        }
        
        console.error("Invalid API response structure:", json);
        return [];
      } catch (err) {
        console.error("Failed to fetch integration connections:", err);
        throw new Error("Failed to fetch integration connections");
      }
    },
  });
  
  // Mutation for testing a connection
  const testMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      try {
        const response = await fetch(`/api/integrations/connections/${connectionId}/test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const json = await response.json();
        return json;
      } catch (error) {
        console.error("Error testing connection:", error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      toast({
        title: data.success ? "Connection is active" : "Connection test failed",
        description: data.message || (data.success 
          ? "The integration is properly connected and working." 
          : "There was an issue with your connection. Please check your settings."),
        variant: data.success ? "default" : "destructive",
      });
      
      // Update the connection status
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/connections"] });
    },
    onError: (error) => {
      toast({
        title: "Error testing connection",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for deleting a connection
  const deleteMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      try {
        const response = await fetch(`/api/integrations/connections/${connectionId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const json = await response.json();
        return json;
      } catch (error) {
        console.error("Error deleting connection:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Integration disconnected",
        description: "The integration has been removed successfully.",
        variant: "default",
      });
      
      // Close deletion dialog and update connections list
      setConnectionToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/connections"] });
    },
    onError: (error) => {
      toast({
        title: "Error removing integration",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      setConnectionToDelete(null);
    },
  });
  
  // Handle test connection click
  const handleTestConnection = (connection: IntegrationConnection) => {
    testMutation.mutate(connection.id);
  };
  
  // Handle delete connection click
  const handleDeleteConnection = () => {
    if (connectionToDelete) {
      deleteMutation.mutate(connectionToDelete.id);
    }
  };
  
  // If there's an error fetching connections
  if (error) {
    return (
      <div className="rounded-md bg-destructive/15 p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-destructive mr-2" />
          <p className="text-sm text-destructive">Failed to load integrations</p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          There was a problem retrieving your connected integrations. Please try refreshing the page.
        </p>
      </div>
    );
  }
  
  // If loading, show skeleton
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-md"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded w-4/5 mt-2"></div>
              <div className="h-3 bg-muted rounded w-3/5 mt-3"></div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2 pt-2">
              <div className="h-9 bg-muted rounded w-20"></div>
              <div className="h-9 bg-muted rounded w-20"></div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  
  // If no connections, show empty state
  if (!connections || connections.length === 0) {
    return (
      <div className="text-center py-12 border rounded-md bg-background">
        <LinkIcon className="mx-auto h-12 w-12 text-muted-foreground/50" strokeWidth={1} />
        <h3 className="mt-4 text-lg font-semibold">No integrations connected</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add an integration from the App Browser to get started.
        </p>
      </div>
    );
  }
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connections.map((connection) => (
          <Card key={connection.id} className="relative overflow-hidden border-slate-200 hover:border-primary/70 transition-colors group">
            {/* App header with icon and background color */}
            <div 
              className="h-16 px-4 flex items-center gap-4" 
              style={{ 
                backgroundColor: connection.backgroundColor || "#f3f4f6"
              }}
            >
              {connection.iconUrl && (
                <div className="flex-shrink-0 w-10 h-10 rounded-md bg-white flex items-center justify-center shadow-sm">
                  <img 
                    src={connection.iconUrl} 
                    alt={connection.name}
                    className="w-7 h-7 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/24x24/cccccc/969696?text=' + connection.name.charAt(0);
                    }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate text-white drop-shadow-sm">{connection.name}</CardTitle>
                <div className="flex items-center mt-1">
                  <Badge 
                    variant="secondary" 
                    className="text-xs bg-white/20 text-white border-0"
                  >
                    {connection.is_active ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 hover:text-white">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditIntegration(connection)}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTestConnection(connection)}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    <span>Test</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setConnectionToDelete(connection)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Disconnect</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Connection status and info */}
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {connection.provider === 'gohighlevel' && 'Connected to GoHighLevel CRM for contact management and messaging.'}
                    {connection.provider === 'openai' && 'Connected to OpenAI for AI-powered email generation and experimentation.'}
                    {!['gohighlevel', 'openai'].includes(connection.provider) && 'Connected integration'}
                  </p>
                  
                  {/* Connection details */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span className="font-medium w-24">Status:</span>
                      {connection.is_active ? (
                        <Badge variant="outline" className="ml-1 text-xs bg-green-50 text-green-700 border-green-200">
                          <Check className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="ml-1 text-xs bg-red-50 text-red-700 border-red-200">
                          <X className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    
                    {connection.last_tested && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span className="font-medium w-24">Last tested:</span>
                        <span>{formatDistanceToNow(new Date(connection.last_tested), { addSuffix: true })}</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="ml-1">
                                {connection.last_test_success !== undefined && (
                                  connection.last_test_success ? (
                                    <Check className="inline h-3 w-3 text-green-500" />
                                  ) : (
                                    <X className="inline h-3 w-3 text-red-500" />
                                  )
                                )}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {connection.last_test_success 
                                ? 'Test was successful' 
                                : 'Test failed - check your settings'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                    
                    {connection.provider === 'openai' && connection.config?.model && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span className="font-medium w-24">Model:</span>
                        <span>{connection.config.model}</span>
                      </div>
                    )}
                    
                    {connection.provider === 'gohighlevel' && connection.config?.locationId && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span className="font-medium w-24">Location ID:</span>
                        <span>{connection.config.locationId}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            
            {/* Action buttons */}
            <CardFooter className="flex justify-end space-x-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestConnection(connection)}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <RefreshCcw className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-1 h-3 w-3" />
                )}
                Test
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onEditIntegration(connection)}
              >
                <Settings className="mr-1 h-3 w-3" />
                Configure
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog
        open={connectionToDelete !== null}
        onOpenChange={(isOpen) => !isOpen && setConnectionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect {connectionToDelete?.name}?
              This will remove the connection and stop all related functionality.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConnection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>Disconnect</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}