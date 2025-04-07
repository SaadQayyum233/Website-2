import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Check, Copy, ExternalLink, RefreshCw, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Form schema for API keys and integration settings
const integrationFormSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  isActive: z.boolean().default(true),
  additionalConfig: z.record(z.any()).optional(),
});

// Interface for integration connections
interface IntegrationConnection {
  id: number;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  config: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Integration status component
 */
const IntegrationStatus = ({ 
  isConnected, 
  lastChecked 
}: { 
  isConnected: boolean; 
  lastChecked?: string 
}) => {
  return (
    <div className="flex items-center">
      {isConnected ? (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center">
          <Check className="w-3 h-3 mr-1" />
          Connected
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center">
          <X className="w-3 h-3 mr-1" />
          Not Connected
        </Badge>
      )}
      {lastChecked && (
        <span className="text-xs text-muted-foreground ml-2">
          Last checked: {new Date(lastChecked).toLocaleString()}
        </span>
      )}
    </div>
  );
};

/**
 * IntegrationCard component for individual service integration
 */
const IntegrationCard = ({ 
  title, 
  description, 
  provider,
  connection,
  onSave,
  onTest,
  configFields = [],
  documentationLink,
  setupInstructions
}: { 
  title: string;
  description: string;
  provider: string;
  connection: IntegrationConnection | null;
  onSave: (values: any) => void;
  onTest: () => Promise<boolean>;
  configFields?: Array<{
    name: string;
    label: string;
    description?: string;
    type?: "text" | "password" | "textarea";
    placeholder?: string;
  }>;
  documentationLink?: string;
  setupInstructions?: string;
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  
  // Initialize form
  const form = useForm({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: {
      apiKey: connection?.access_token || "",
      isActive: connection?.is_active ?? true,
      additionalConfig: connection?.config || {},
    },
  });

  // Reset form when connection changes
  useEffect(() => {
    if (connection) {
      form.reset({
        apiKey: connection.access_token || "",
        isActive: connection.is_active,
        additionalConfig: connection.config || {},
      });
    }
  }, [connection, form]);

  // Handle form submission
  const onSubmit = async (values: any) => {
    try {
      await onSave({
        provider,
        access_token: values.apiKey,
        is_active: values.isActive,
        config: values.additionalConfig,
      });
      toast({
        title: "Integration settings saved",
        description: `Your ${title} integration has been updated.`,
      });
      setOpen(false);
    } catch (error) {
      console.error("Error saving integration:", error);
      toast({
        title: "Error saving integration",
        description: "There was a problem saving your integration settings.",
        variant: "destructive",
      });
    }
  };

  // Handle connection test
  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await onTest();
      setTestResult(result);
      
      toast({
        title: result ? "Connection successful" : "Connection failed",
        description: result 
          ? `Successfully connected to ${title}` 
          : `Could not connect to ${title}. Please check your API key and settings.`,
        variant: result ? "default" : "destructive",
      });
    } catch (error) {
      setTestResult(false);
      toast({
        title: "Connection test failed",
        description: "There was an error testing the connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <IntegrationStatus 
            isConnected={!!connection?.access_token && connection?.is_active} 
            lastChecked={connection?.updated_at}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {connection?.access_token ? (
            <div className="bg-muted p-3 rounded-md flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">API Key:</span>
                <span className="text-sm font-mono">••••••••••••••••{connection.access_token.slice(-4)}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
                Change
              </Button>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Not configured</AlertTitle>
              <AlertDescription>
                This integration needs to be set up before it can be used.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handleTest}
          disabled={!connection?.access_token || isTesting}
        >
          {isTesting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
          Test Connection
        </Button>
        <Button onClick={() => setOpen(true)}>
          {connection?.access_token ? "Edit Configuration" : "Set Up Integration"}
        </Button>
      </CardFooter>

      {/* Configuration Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{connection?.access_token ? "Edit" : "Set Up"} {title} Integration</DialogTitle>
            <DialogDescription>
              Configure your integration with {title}. You'll need an API key from your account.
              {documentationLink && (
                <a 
                  href={documentationLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-primary mt-2 text-sm"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View documentation
                </a>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {setupInstructions && (
                <div className="bg-muted p-3 rounded-md text-sm mb-4">
                  <h4 className="font-medium mb-1">Setup Instructions:</h4>
                  <p className="text-muted-foreground">{setupInstructions}</p>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter your API key" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Your API key is stored securely and used to authenticate with the service.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Enable or disable this integration
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Additional configuration fields */}
              {configFields.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <h4 className="text-sm font-medium mb-3">Additional Configuration</h4>
                  
                  {configFields.map(field => (
                    <FormField
                      key={field.name}
                      control={form.control}
                      name={`additionalConfig.${field.name}`}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{field.label}</FormLabel>
                          <FormControl>
                            {field.type === "textarea" ? (
                              <Textarea 
                                placeholder={field.placeholder} 
                                {...formField} 
                                value={formField.value || ""}
                              />
                            ) : (
                              <Input 
                                type={field.type || "text"} 
                                placeholder={field.placeholder} 
                                {...formField} 
                                value={formField.value || ""}
                              />
                            )}
                          </FormControl>
                          {field.description && (
                            <FormDescription>{field.description}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </>
              )}

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

/**
 * Documentation tab component
 */
const DocumentationTab = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Integration Documentation</h3>
        <p className="text-muted-foreground mb-4">
          Learn how to set up and use each integration in this application.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GoHighLevel Integration</CardTitle>
          <CardDescription>Connect to GoHighLevel to synchronize contacts and send emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-1">Required Permissions</h4>
            <ul className="list-disc pl-5 text-sm">
              <li className="mb-1">Contacts - Read and Write</li>
              <li className="mb-1">Conversations - Read and Write</li>
              <li className="mb-1">Webhooks - Full Access</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-1">Setup Instructions</h4>
            <ol className="list-decimal pl-5 text-sm space-y-2">
              <li>Log in to your GoHighLevel account</li>
              <li>Navigate to Settings &gt; API &gt; API Keys</li>
              <li>Create a new API Key with the required permissions</li>
              <li>Copy the API Key and paste it in the integration settings</li>
              <li>For webhook functionality, add the following URL to your GHL webhooks settings:
                <div className="bg-muted p-2 rounded mt-1 font-mono text-xs">
                  https://[your-app-url]/api/webhooks/ghl
                </div>
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OpenAI Integration</CardTitle>
          <CardDescription>Connect to OpenAI to generate email variations and analyze performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-1">Setup Instructions</h4>
            <ol className="list-decimal pl-5 text-sm space-y-2">
              <li>Log in to the <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI platform</a></li>
              <li>Navigate to API keys section</li>
              <li>Create a new API key with an appropriate name (e.g., "Email Automation App")</li>
              <li>Copy the API Key and paste it in the integration settings</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-medium mb-1">Usage Notes</h4>
            <ul className="list-disc pl-5 text-sm">
              <li className="mb-1">Your OpenAI API key is used for email variant generation and performance analysis</li>
              <li className="mb-1">You will be billed by OpenAI based on your usage according to their pricing model</li>
              <li className="mb-1">The app uses gpt-4o for best results</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>Set up webhooks to receive events from external services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-1">Webhook Endpoints</h4>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">GoHighLevel Webhook URL:</p>
                <div className="flex items-center mt-1">
                  <code className="bg-muted p-2 rounded text-xs font-mono flex-1">
                    https://[your-app-url]/api/webhooks/ghl
                  </code>
                  <Button variant="ghost" size="sm" className="ml-2" onClick={() => {
                    navigator.clipboard.writeText(`https://[your-app-url]/api/webhooks/ghl`);
                  }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-1">Required Webhook Events</h4>
            <p className="text-sm mb-2">For email tracking to work properly, subscribe to these events:</p>
            <ul className="list-disc pl-5 text-sm">
              <li className="mb-1">Email Delivered</li>
              <li className="mb-1">Email Opened</li>
              <li className="mb-1">Email Clicked</li>
              <li className="mb-1">Email Bounced</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Main IntegrationManager component
 */
export function IntegrationManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("integrations");
  const [integrations, setIntegrations] = useState<IntegrationConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch user's integration connections
  useEffect(() => {
    const fetchIntegrations = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest("/api/integrations");
        setIntegrations(response.data || []);
      } catch (error) {
        console.error("Error fetching integrations:", error);
        toast({
          title: "Failed to load integrations",
          description: "There was a problem loading your integration settings.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchIntegrations();
  }, [toast]);
  
  // Find a specific integration by provider
  const findIntegration = (provider: string) => {
    return integrations.find(i => i.provider === provider) || null;
  };
  
  // Save integration settings
  const saveIntegration = async (data: any) => {
    try {
      const response = await apiRequest("/api/integrations", {
        method: "POST",
        data,
      });
      
      // Update local state
      setIntegrations(prev => {
        const existingIndex = prev.findIndex(i => i.provider === data.provider);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = response.data;
          return updated;
        } else {
          return [...prev, response.data];
        }
      });
      
      return response.data;
    } catch (error) {
      console.error("Error saving integration:", error);
      throw error;
    }
  };
  
  // Test integration connection
  const testIntegration = async (provider: string) => {
    try {
      const response = await apiRequest(`/api/integrations/${provider}/test`, {
        method: "POST",
      });
      return response.success === true;
    } catch (error) {
      console.error(`Error testing ${provider} integration:`, error);
      return false;
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">API Integrations</h2>
        <p className="text-muted-foreground mb-6">
          Manage connections to external services and APIs
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="integrations" className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="flex items-center space-x-2">
                <RefreshCw className="animate-spin h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Loading integrations...</span>
              </div>
            </div>
          ) : (
            <>
              {/* GHL Integration */}
              <IntegrationCard
                title="GoHighLevel"
                description="Connect to GoHighLevel to synchronize contacts and send emails"
                provider="gohighlevel"
                connection={findIntegration("gohighlevel")}
                onSave={saveIntegration}
                onTest={() => testIntegration("gohighlevel")}
                configFields={[
                  {
                    name: "locationId",
                    label: "Location ID (Optional)",
                    description: "If you have multiple locations, specify which one to use",
                    placeholder: "Enter location ID"
                  },
                  {
                    name: "webhookSecret",
                    label: "Webhook Secret (Optional)",
                    description: "Used to verify incoming webhooks from GHL",
                    type: "password",
                    placeholder: "Enter webhook secret"
                  }
                ]}
                documentationLink="https://developers.gohighlevel.com/"
                setupInstructions="You'll need an API key from your GoHighLevel account. Go to Settings > API > API Keys to create one."
              />
              
              {/* OpenAI Integration */}
              <IntegrationCard
                title="OpenAI"
                description="Connect to OpenAI to generate email variations and analyze performance"
                provider="openai"
                connection={findIntegration("openai")}
                onSave={saveIntegration}
                onTest={() => testIntegration("openai")}
                configFields={[
                  {
                    name: "model",
                    label: "Default Model",
                    description: "The OpenAI model to use by default",
                    placeholder: "gpt-4o",
                  },
                  {
                    name: "temperature",
                    label: "Temperature",
                    description: "Controls randomness (0-1), lower values are more focused",
                    placeholder: "0.7"
                  }
                ]}
                documentationLink="https://platform.openai.com/docs/introduction"
                setupInstructions="You'll need an API key from your OpenAI account. Go to API keys section in your OpenAI dashboard to create one."
              />
            </>
          )}
        </TabsContent>
        
        <TabsContent value="documentation">
          <DocumentationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}