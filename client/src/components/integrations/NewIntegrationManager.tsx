import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { IntegrationApp } from "./AddAppView";
import AddAppView from "./AddAppView";
import ConnectedApps, { IntegrationConnection } from "./ConnectedApps";
import DocumentationTab from "./DocumentationTab";
import IntegrationSetupWizard from "./IntegrationSetupWizard";
import WebhookSetupSelector from "./WebhookSetupSelector";

/**
 * Main IntegrationManager component - Complete redesign based on Make.com approach
 */
export function IntegrationManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("connected");
  const [selectedApp, setSelectedApp] = useState<IntegrationApp | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<IntegrationConnection | null>(null);
  
  // Fetch user's integration connections
  const { 
    data: connections, 
    isLoading: isLoadingConnections,
    error: connectionsError,
    isError
  } = useQuery({
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
        return []; // Return empty array instead of throwing
      } catch (err) {
        console.error("Error fetching connections:", err);
        return []; // Return empty array on error
      }
    },
  });
  
  // Save integration settings
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        const response = await apiRequest("POST", "/api/integrations/connections", data);
        return response;
      } catch (error) {
        console.error("Error saving integration:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/connections"] });
      setActiveTab("connected");
    },
    onError: (error) => {
      toast({
        title: "Error saving integration",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Handle app selection from the browser
  const handleAppSelect = (app: IntegrationApp) => {
    setSelectedApp(app);
    setIsSetupModalOpen(true);
  };
  
  // Handle editing an existing connection
  const handleEditConnection = (connection: IntegrationConnection) => {
    setEditingConnection(connection);
    
    // Find the corresponding app
    fetchAppDetails(connection.provider);
  };
  
  // Fetch app details when editing
  const fetchAppDetails = async (providerId: string) => {
    try {
      const response = await apiRequest("GET", `/api/integrations/available-apps/${providerId}`);
      if (response && response.data) {
        setSelectedApp(response.data);
        setIsSetupModalOpen(true);
      } else {
        // Handle the case where the response is valid but data is missing
        console.warn("App details missing for provider:", providerId);
        toast({
          title: "Warning",
          description: "Could not load all app configuration details.",
          variant: "default",
        });
        // Still open the modal with potentially limited data
        setIsSetupModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching app details:", error);
      toast({
        title: "Error",
        description: "Could not load app configuration details.",
        variant: "destructive",
      });
    }
  };
  
  // Save the integration
  const handleSaveIntegration = async (data: any) => {
    return saveMutation.mutateAsync(data);
  };
  
  // Close the setup modal and reset state
  const handleCloseSetupModal = () => {
    setIsSetupModalOpen(false);
    setSelectedApp(null);
    setEditingConnection(null);
  };
  
  // Use useEffect to handle errors instead of in render function to prevent infinite re-renders
  useEffect(() => {
    if (connectionsError) {
      toast({
        title: "Failed to load integrations",
        description: "There was a problem loading your integration settings.",
        variant: "destructive",
      });
    }
  }, [connectionsError, toast]);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-2">Integrations</h2>
          <p className="text-muted-foreground">
            Connect external services and APIs to build your application workflows
          </p>
        </div>
        {activeTab === "connected" && (
          <Button 
            size="default"
            onClick={() => setActiveTab("browse")}
            className="h-10"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Integration
          </Button>
        )}
      </div>
      
      <div className="rounded-lg border bg-card overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
            <TabsList className="bg-transparent p-0 h-9">
              <TabsTrigger 
                value="connected" 
                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Connected Apps
              </TabsTrigger>
              <TabsTrigger 
                value="browse"
                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Add App
              </TabsTrigger>
              <TabsTrigger 
                value="documentation"
                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Documentation
              </TabsTrigger>
            </TabsList>
            
            {activeTab === "browse" && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveTab("connected")}
              >
                Back to Connected Apps
              </Button>
            )}
          </div>
          
          <div className="p-4 sm:p-6">
            <TabsContent value="connected" className="mt-0 space-y-6">
              {isLoadingConnections ? (
                <div className="flex justify-center py-12">
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="animate-spin h-8 w-8 text-primary/80" />
                    <span className="text-muted-foreground text-sm">Loading your integrations...</span>
                  </div>
                </div>
              ) : (
                <ConnectedApps 
                  onEditIntegration={handleEditConnection}
                />
              )}
            </TabsContent>
            
            <TabsContent value="browse" className="mt-0 space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">Available Applications</h3>
                <div className="flex gap-2">
                  <WebhookSetupSelector 
                    buttonText="Configure Webhook" 
                    buttonVariant="outline"
                  />
                </div>
              </div>
              <AddAppView 
                onSelectApp={handleAppSelect}
              />
            </TabsContent>
            
            <TabsContent value="documentation" className="mt-0">
              <DocumentationTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
      
      {/* Integration Setup Wizard Modal */}
      <IntegrationSetupWizard
        app={selectedApp}
        existingConnection={editingConnection}
        isOpen={isSetupModalOpen}
        onClose={handleCloseSetupModal}
        onSave={handleSaveIntegration}
      />
    </div>
  );
}