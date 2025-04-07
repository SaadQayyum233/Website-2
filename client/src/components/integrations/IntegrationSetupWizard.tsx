import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Check, Copy, Link2, AlertCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
// Fix import error by providing the correct path to the stepper component
import { Stepper, Step } from "@/components/ui/stepper";
import { IntegrationApp } from "./AddAppView";
import { IntegrationConnection } from "./ConnectedApps";

// Environment variables for application URL
const APP_URL = window.location.origin;

interface IntegrationSetupWizardProps {
  app: IntegrationApp | null;
  existingConnection?: IntegrationConnection | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (connectionData: any) => Promise<any>;
}

const IntegrationSetupWizard = ({ app, existingConnection, isOpen, onClose, onSave }: IntegrationSetupWizardProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message?: string} | null>(null);
  const [generatedValues, setGeneratedValues] = useState<{[key: string]: string}>({});
  
  // Define steps based on auth method
  const getSteps = () => {
    if (!app) return [];
    
    switch (app.authMethod) {
      case 'oauth':
      case 'ghl-oauth':
        return ['Choose Connection Method', 'Configure OAuth', 'Set Up Webhooks', 'Test & Save'];
      case 'apikey':
        return ['Configure API Key', 'Additional Settings', 'Test & Save'];
      case 'webhook':
        return ['Configure Webhook', 'Test & Save'];
      default:
        return ['Configure Settings', 'Test & Save'];
    }
  };
  
  const steps = getSteps();

  // Generate connection-specific values
  useEffect(() => {
    if (app) {
      // Generate a unique user/connection identifier
      const userId = "1"; // This would come from auth in production
      const connectionId = Date.now().toString();
      
      const values: {[key: string]: string} = {
        webhookUrl: `${APP_URL}/api/webhooks/incoming/${app.id}/${userId}_${connectionId}`,
        redirectUri: `${APP_URL}/api/auth/${app.id}/callback`,
      };
      
      // App-specific generated values
      if (app.id === 'gohighlevel') {
        values.ghlDevelopersUrl = 'https://marketplace.gohighlevel.com/';
        values.ghlApiDocsUrl = 'https://developers.gohighlevel.com/';
      }
      
      setGeneratedValues(values);
    }
  }, [app]);

  // Create a dynamic Zod schema based on app config fields
  const createFormSchema = () => {
    if (!app) return z.object({});
    
    const schemaFields: {[key: string]: any} = {};
    
    app.configFields.forEach(field => {
      if (field.required) {
        schemaFields[field.name] = z.string().min(1, `${field.label} is required`);
      } else {
        schemaFields[field.name] = z.string().optional();
      }
    });
    
    // Add webhook event selection fields if available
    if (app.availableTriggers && app.availableTriggers.length > 0) {
      schemaFields.selectedWebhookEvents = z.array(z.string()).optional();
    }
    
    // Add OAuth scopes selection fields if available
    if (app.authMethod === 'oauth' || app.authMethod === 'ghl-oauth') {
      schemaFields.selectedScopes = z.array(z.string()).optional();
    }
    
    return z.object(schemaFields);
  };
  
  const formSchema = createFormSchema();
  
  // Prepare default values for the form
  const prepareDefaultValues = () => {
    // Start with some base fields that all forms might need
    const defaults: any = {
      apiKey: existingConnection?.access_token || '',
      webhookSecret: existingConnection?.config?.webhookSecret || '',
      locationId: existingConnection?.config?.locationId || '',
      connectionMethod: existingConnection?.config?.connectionMethod || 'oauth',
      webhookName: existingConnection?.name || '',
      selectedWebhookEvents: existingConnection?.config?.selectedWebhookEvents || [],
      authRequired: existingConnection?.config?.authRequired || false,
      authType: existingConnection?.config?.authType || 'API Key',
    };
    
    // Add app-specific fields from config
    if (app?.configFields) {
      app.configFields.forEach(field => {
        defaults[field.name] = existingConnection?.config?.[field.name] || '';
      });
    }
    
    return defaults;
  };
  
  // Set up the form with React Hook Form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: prepareDefaultValues(),
  });
  
  // Reset form when app changes or load existing values
  useEffect(() => {
    if (app) {
      // Initialize with existing values if editing, or empty values for new connection
      if (existingConnection && existingConnection.provider === app.id) {
        // Use values from existing connection when editing
        const initialValues = app.configFields.reduce((acc, field) => {
          // Get from existing config or set empty string
          acc[field.name] = existingConnection.config && 
            existingConnection.config[field.name] !== undefined ? 
            existingConnection.config[field.name] : '';
          return acc;
        }, {} as any);
        
        // Set webhook events if available
        if (app.availableTriggers && app.availableTriggers.length > 0 && 
            existingConnection.config && existingConnection.config.selectedWebhookEvents) {
          initialValues.selectedWebhookEvents = existingConnection.config.selectedWebhookEvents;
        }
        
        // Set OAuth scopes if available
        if ((app.authMethod === 'oauth' || app.authMethod === 'ghl-oauth') && 
            existingConnection.config && existingConnection.config.selectedScopes) {
          initialValues.selectedScopes = existingConnection.config.selectedScopes;
        }
        
        form.reset(initialValues);
      } else {
        // Initialize with empty values for new connection
        form.reset(
          app.configFields.reduce((acc, field) => {
            acc[field.name] = '';
            return acc;
          }, {} as any)
        );
      }
      
      setCurrentStep(0);
      setTestResult(null);
    }
  }, [app, existingConnection, form]);
  
  // Copy value to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Value has been copied to your clipboard.",
    });
  };
  
  // Handle moving between steps
  const handleNext = async () => {
    // Validate current step
    const isValid = await form.trigger();
    if (isValid) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  // Test connection
  const testConnection = async () => {
    if (!app) return;
    
    setIsTestingConnection(true);
    setTestResult(null);
    
    try {
      const values = form.getValues();
      
      // Prepare data for testing
      const testData = {
        provider: app.id,
        config: values,
      };
      
      const response = await apiRequest("POST", `/api/integrations/${app.id}/test`, testData);
      
      if (response.success) {
        setTestResult({ success: true, message: "Connection test successful!" });
      } else {
        setTestResult({ 
          success: false, 
          message: response.message || "Connection test failed. Please check your settings."
        });
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : "Unknown error during connection test"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  // Save connection
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!app) return;
    
    setIsSubmitting(true);
    
    try {
      // Extract API key or access token based on auth method
      const accessToken = values.apiKey || values.oauth_access_token || '';
      
      // Prepare data for saving
      const connectionData = {
        id: existingConnection?.id, // Include ID if editing an existing connection
        provider: app.id,
        name: values.appName || app.name,
        iconUrl: app.icon,
        backgroundColor: app.backgroundColor,
        // CRITICAL: This field is required by the server schema
        access_token: accessToken,
        refresh_token: values.oauth_refresh_token || null,
        token_expires_at: values.oauth_expires_at || null,
        is_active: existingConnection?.is_active ?? true,
        config: values,
      };
      
      console.log("Saving connection data:", connectionData);
      await onSave(connectionData);
      
      toast({
        title: existingConnection ? "Connection updated" : "Connection saved",
        description: existingConnection 
          ? `${app.name} integration has been successfully updated.`
          : `${app.name} has been successfully connected.`,
        variant: "default",
      });
      
      onClose();
    } catch (error) {
      console.error("Error saving connection:", error);
      toast({
        title: existingConnection ? "Error updating connection" : "Error saving connection",
        description: error instanceof Error ? error.message : "Unknown error saving connection",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle closing the dialog
  const handleCloseDialog = () => {
    // Reset state
    setCurrentStep(0);
    setTestResult(null);
    form.reset();
    onClose();
  };
  
  // Render OAuth configuration form
  const renderOAuthConfig = () => {
    if (!app) return null;
    
    return (
      <div className="space-y-4">
        <Alert className="bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-700" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            You'll need to register this application with {app.name} to get your OAuth credentials.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4 my-4">
          <FormField
            control={form.control}
            name="appName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>App Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter a name for this app"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  A name to identify this integration in your account
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-1">
            <p className="text-sm font-medium">Your Redirect URI (copy this to {app.name})</p>
            <div className="flex items-center">
              <code className="flex-1 bg-muted p-2 text-sm rounded-l-md">
                {generatedValues.redirectUri}
              </code>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 rounded-l-none"
                onClick={() => copyToClipboard(generatedValues.redirectUri)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {app.id === 'gohighlevel' && (
            <div className="flex mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => window.open(generatedValues.ghlDevelopersUrl, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Go to GHL Developer Portal
              </Button>
            </div>
          )}
        </div>
        
        {app.configFields.map((field) => (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  <Input 
                    type={field.type === 'password' ? 'password' : 'text'}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    {...formField}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        
        {/* Authentication Method Selection */}
        <FormField
          control={form.control}
          name="authMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Authentication Method</FormLabel>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="auth-oauth" 
                    checked={field.value === 'oauth' || !field.value}
                    onCheckedChange={() => {
                      if (!field.value || field.value !== 'oauth') {
                        field.onChange('oauth');
                      }
                    }}
                  />
                  <label htmlFor="auth-oauth" className="text-sm font-medium">OAuth</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="auth-apikey" 
                    checked={field.value === 'apikey'}
                    onCheckedChange={() => {
                      if (field.value !== 'apikey') {
                        field.onChange('apikey');
                      }
                    }}
                  />
                  <label htmlFor="auth-apikey" className="text-sm font-medium">API Key</label>
                </div>
              </div>
              <FormDescription>
                Choose how this integration will authenticate with {app.name}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* OAuth Scopes Selection */}
        {app.authMethod === 'ghl-oauth' && (
          <div className="space-y-3 mt-4">
            <h4 className="text-sm font-medium">Required API Scopes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {['contacts.readonly', 'contacts.write', 'locations.readonly', 'conversations.readonly', 'conversations.write'].map((scope) => (
                <div key={scope} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`scope-${scope}`} 
                    checked={true}
                    disabled={true}
                  />
                  <label htmlFor={`scope-${scope}`} className="text-sm">{scope}</label>
                </div>
              ))}
            </div>
            <FormDescription>
              These scopes are required for the core functionality of our integration with {app.name}.
            </FormDescription>
          </div>
        )}
      </div>
    );
  };
  
  // Render API Key configuration form
  const renderApiKeyConfig = () => {
    if (!app) return null;
    
    return (
      <div className="space-y-4">
        {app.configFields.map((field) => (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  <Input 
                    type={field.type === 'password' ? 'password' : 'text'}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    {...formField}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        
        {app.id === 'openai' && (
          <Alert className="bg-blue-50">
            <Link2 className="h-4 w-4 text-blue-700" />
            <AlertTitle>Get your API Key</AlertTitle>
            <AlertDescription>
              <p className="mb-2">Create an API key in your OpenAI account:</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Go to OpenAI API Keys
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };
  
  // Render webhook configuration form
  const renderWebhookConfig = () => {
    if (!app) return null;
    
    // For GHL, display GHL-specific webhook setup
    if (app.id === 'gohighlevel') {
      return (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-medium">Set Up GoHighLevel Webhooks</h3>
            <p className="text-sm text-muted-foreground">
              Configure which events you want to receive from GoHighLevel. These events will trigger
              actions in our system.
            </p>
          </div>
          
          <Alert className="bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-700" />
            <AlertTitle>Your Webhook Endpoint URL</AlertTitle>
            <AlertDescription>
              <p className="mb-2">Use this URL in GoHighLevel webhook settings:</p>
              <div className="flex items-center">
                <code className="flex-1 bg-muted p-2 text-sm rounded-l-md break-all">
                  {generatedValues.webhookUrl}
                </code>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-9 rounded-l-none"
                  onClick={() => copyToClipboard(generatedValues.webhookUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2 border rounded-md p-4">
            <FormLabel className="text-base">Select Events to Monitor</FormLabel>
            <p className="text-sm text-muted-foreground mb-4">
              Choose which GoHighLevel events should trigger actions in our system
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { id: 'contact.created', name: 'Contact Created', description: 'When a new contact is added to GHL' },
                { id: 'contact.updated', name: 'Contact Updated', description: 'When contact information changes' },
                { id: 'contact.deleted', name: 'Contact Deleted', description: 'When a contact is removed' },
                { id: 'email.delivered', name: 'Email Delivered', description: 'When an email is successfully delivered' },
                { id: 'email.opened', name: 'Email Opened', description: 'When a recipient opens an email' },
                { id: 'email.clicked', name: 'Email Clicked', description: 'When a recipient clicks a link in an email' }
              ].map(event => (
                <div key={event.id} className="flex items-start space-x-2">
                  <Checkbox 
                    id={`event-${event.id}`}
                    checked={(form.watch('selectedWebhookEvents') || []).includes(event.id)}
                    onCheckedChange={(checked) => {
                      const currentEvents = form.getValues().selectedWebhookEvents || [];
                      if (checked) {
                        form.setValue('selectedWebhookEvents', [...currentEvents, event.id], { shouldValidate: true, shouldDirty: true });
                      } else {
                        form.setValue(
                          'selectedWebhookEvents', 
                          currentEvents.filter((e: string) => e !== event.id), 
                          { shouldValidate: true, shouldDirty: true }
                        );
                      }
                    }}
                  />
                  <div>
                    <label htmlFor={`event-${event.id}`} className="text-sm font-medium block">{event.name}</label>
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <FormField
            control={form.control}
            name="webhookSecret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Webhook Secret</FormLabel>
                <FormControl>
                  <Input 
                    type="password"
                    placeholder="Enter a secure secret key"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  This secret is used to verify webhook requests are actually from GoHighLevel
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Setup Instructions</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal list-inside space-y-1 text-sm mt-2">
                <li>Go to your GoHighLevel account</li>
                <li>Navigate to Settings -&gt; API -&gt; Webhooks</li>
                <li>Click "Create Webhook"</li>
                <li>Enter a name for this webhook connection</li>
                <li>Paste the URL above into the "URL" field</li>
                <li>Select the events you want to track (same as selected above)</li>
                <li>Copy your webhook secret (if provided by GHL) and paste it here</li>
                <li>Save the webhook in GoHighLevel</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    
    // For general/other webhooks
    return (
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="webhookName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Webhook Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter a name for this webhook"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                A descriptive name to identify this incoming webhook
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Webhook Configuration */}
        <Alert className="bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-700" />
          <AlertTitle>Your Webhook URL</AlertTitle>
          <AlertDescription>
            <p className="mb-2">Use this unique URL to receive events from {app.name}:</p>
            <div className="flex items-center">
              <code className="flex-1 bg-muted p-2 text-sm rounded-l-md break-all">
                {generatedValues.webhookUrl}
              </code>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 rounded-l-none"
                onClick={() => copyToClipboard(generatedValues.webhookUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
        
        {app.configFields.map((field) => (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  <Input 
                    type={field.type === 'password' ? 'password' : 'text'}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    {...formField}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        
        {/* Authentication Settings */}
        <FormField
          control={form.control}
          name="authRequired"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Authentication Required</FormLabel>
                <FormDescription>
                  Enable if this endpoint requires authentication
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {form.getValues("authRequired") && (
          <FormField
            control={form.control}
            name="authType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Authentication Type</FormLabel>
                <div className="space-y-2">
                  {["Basic Auth", "API Key", "Bearer Token", "OAuth"].map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`auth-${type}`} 
                        checked={field.value === type}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange(type);
                          }
                        }}
                      />
                      <label htmlFor={`auth-${type}`} className="text-sm font-medium">{type}</label>
                    </div>
                  ))}
                </div>
                <FormDescription>
                  Select the authentication method for this integration
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        {/* Webhook Event Selection */}
        {app.availableTriggers && app.availableTriggers.length > 0 && (
          <div className="space-y-3 mt-4">
            <h4 className="text-sm font-medium">Available Webhook Events</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {app.availableTriggers.map((trigger) => (
                <div key={trigger.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`trigger-${trigger.id}`}
                    checked={(form.watch('selectedWebhookEvents') || []).includes(trigger.id)}
                    onCheckedChange={(checked) => {
                      const current = form.getValues().selectedWebhookEvents || [];
                      if (checked) {
                        form.setValue("selectedWebhookEvents", [...current, trigger.id], { shouldValidate: true, shouldDirty: true });
                      } else {
                        form.setValue(
                          "selectedWebhookEvents",
                          current.filter((id) => id !== trigger.id),
                          { shouldValidate: true, shouldDirty: true }
                        );
                      }
                    }}
                  />
                  <label htmlFor={`trigger-${trigger.id}`} className="text-sm">{trigger.name}</label>
                </div>
              ))}
            </div>
            <FormDescription>
              Select which events you want to receive from {app.name}.
            </FormDescription>
          </div>
        )}
      </div>
    );
  };
  
  // Render test and save step
  const renderTestAndSave = () => {
    return (
      <div className="space-y-4">
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Review and Confirm</h3>
          <p className="text-muted-foreground">
            {existingConnection 
              ? `You're updating your ${app?.name} integration settings. Click "Test Connection" to verify before saving.`
              : `You're about to connect ${app?.name}. Click "Test Connection" to verify your settings before saving.`
            }
          </p>
        </div>
        
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={testConnection}
            disabled={isTestingConnection}
            className="w-full sm:w-auto"
          >
            {isTestingConnection ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>Test Connection</>
            )}
          </Button>
          
          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {testResult.success ? "Success" : "Connection Failed"}
              </AlertTitle>
              <AlertDescription>
                {testResult.message}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  };
  
  // Render step content based on current step and auth method
  // State to track selected connection method
  const [connectionMethod, setConnectionMethod] = useState<'oauth' | 'apikey'>('oauth');
  
  const renderStepContent = () => {
    if (!app) return null;
    
    // For OAuth
    if (app.authMethod === 'oauth' || app.authMethod === 'ghl-oauth') {
      switch (currentStep) {
        case 0: // Choose Connection Method
          return (
            <div className="space-y-4">
              <Tabs 
                defaultValue="oauth" 
                className="w-full"
                onValueChange={(value) => {
                  setConnectionMethod(value as 'oauth' | 'apikey');
                  // Update form field for tracking method selection
                  form.setValue('connectionMethod', value);
                }}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="oauth">OAuth (Recommended)</TabsTrigger>
                  <TabsTrigger value="apikey">API Key</TabsTrigger>
                </TabsList>
                
                <TabsContent value="oauth" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-medium">Connect with OAuth</h3>
                    <p className="text-sm text-muted-foreground">
                      This is the recommended method as it provides secure access and doesn't require
                      handling API keys directly.
                    </p>
                    
                    {app.id === 'gohighlevel' && (
                      <Alert className="bg-blue-50 mt-4">
                        <AlertCircle className="h-4 w-4 text-blue-700" />
                        <AlertTitle>Important</AlertTitle>
                        <AlertDescription>
                          You'll need to register your application in the GoHighLevel Marketplace.
                          Be sure to use the redirect URI shown below in your GHL Developer settings.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-1 mt-4">
                      <p className="text-sm font-medium">Your Redirect URI (copy this to {app.name})</p>
                      <div className="flex items-center">
                        <code className="flex-1 bg-muted p-2 text-sm rounded-l-md">
                          {generatedValues.redirectUri}
                        </code>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-9 rounded-l-none"
                          onClick={() => copyToClipboard(generatedValues.redirectUri)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex mt-4">
                      <Button 
                        onClick={() => {
                          if (app.id === 'gohighlevel') {
                            // Open OAuth flow in a new window
                            window.open('/api/auth/ghl', '_blank', 'width=600,height=700');
                          } else {
                            handleNext();
                          }
                        }}
                      >
                        Continue with OAuth
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="apikey" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-medium">Connect with API Key</h3>
                    <p className="text-sm text-muted-foreground">
                      Use this method if you prefer to connect using a static API key instead of OAuth.
                    </p>
                    
                    {app.id === 'gohighlevel' && (
                      <div className="space-y-4 mt-4">
                        <FormField
                          control={form.control}
                          name="apiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GoHighLevel API Key</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password"
                                  placeholder="Enter your GHL API Key"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                You can find your API Key in your GoHighLevel dashboard under Settings -&gt; API -&gt; API Keys
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="locationId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location ID</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter your GHL Location ID"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                If you have multiple locations, specify which one to use
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Alert className="bg-amber-50">
                          <AlertCircle className="h-4 w-4 text-amber-700" />
                          <AlertTitle>API Key Limitations</AlertTitle>
                          <AlertDescription>
                            Using API Key authentication provides limited access compared to OAuth.
                            Some features like real-time webhooks may not work properly.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                    
                    <div className="flex mt-4">
                      <Button 
                        onClick={() => handleNext()}
                        disabled={app.id === 'gohighlevel' && 
                          (!form.getValues('apiKey') || !form.getValues('locationId'))}
                      >
                        Continue with API Key
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          );
        case 1: // Configure OAuth or API Key (depends on method selected)
          return connectionMethod === 'oauth' ? renderOAuthConfig() : renderApiKeyConfig();
        case 2: // Set Up Webhooks
          return renderWebhookConfig();
        case 3: // Test & Save
          return renderTestAndSave();
        default:
          return null;
      }
    }
    
    // For API Key
    if (app.authMethod === 'apikey') {
      switch (currentStep) {
        case 0: // Configure API Key
          return renderApiKeyConfig();
        case 1: // Additional Settings
          return renderWebhookConfig();
        case 2: // Test & Save
          return renderTestAndSave();
        default:
          return null;
      }
    }
    
    // For Webhook-only connections
    if (app.authMethod === 'webhook') {
      switch (currentStep) {
        case 0: // Configure Webhook
          return renderWebhookConfig();
        case 1: // Test & Save
          return renderTestAndSave();
        default:
          return null;
      }
    }
    
    // Default fallback
    return renderApiKeyConfig();
  };
  
  if (!app) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {app.iconUrl && (
              <div
                className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: app.backgroundColor || "#f3f4f6" }}
              >
                <img 
                  src={app.iconUrl} 
                  alt={app.name} 
                  className="w-4 h-4 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/16x16/cccccc/969696?text=' + app.name.charAt(0);
                  }}
                />
              </div>
            )}
            {existingConnection ? `Edit ${app.name} Connection` : `Connect ${app.name}`}
          </DialogTitle>
          <DialogDescription>
            {app.description}
          </DialogDescription>
        </DialogHeader>
        
        {steps.length > 1 && (
          <>
            <Stepper currentStep={currentStep} className="my-6">
              {steps.map((step, index) => (
                <Step key={index} title={step} />
              ))}
            </Stepper>
            <Separator className="my-6" />
          </>
        )}
        
        <ScrollArea className="flex-grow pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {renderStepContent()}
              
              <DialogFooter className="flex justify-between sm:justify-between border-t pt-4 mt-6">
                <div>
                  {currentStep > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={isSubmitting}
                    >
                      Back
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                  >
                    Cancel
                  </Button>
                  
                  {currentStep < steps.length - 1 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isSubmitting || (testResult && !testResult.success)}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {existingConnection ? 'Updating...' : 'Saving...'}
                        </>
                      ) : (
                        <>{existingConnection ? 'Update Connection' : 'Save Connection'}</>
                      )}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default IntegrationSetupWizard;