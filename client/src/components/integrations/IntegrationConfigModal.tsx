import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { CheckCircle2, Copy, AlertTriangle } from "lucide-react";
import useGHLAuth from "@/hooks/useGHLAuth";

interface AppData {
  id: string;
  name: string;
  iconUrl: string;
  backgroundColor: string;
  type: 'oauth' | 'apikey' | 'webhook' | 'builtin';
  description: string;
  category: string;
  badges: string[];
  configurationFields: Array<{
    name?: string;
    label: string;
    type: string;
    required?: boolean;
    displayValue?: string;
  }>;
}

interface IntegrationConfigModalProps {
  app: AppData;
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
}

const IntegrationConfigModal: React.FC<IntegrationConfigModalProps> = ({
  app,
  isOpen,
  onClose,
  isConnected
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { initiateGHLAuth } = useGHLAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (app.type === 'oauth') {
      return; // OAuth is handled differently
    }

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/settings/integrations/connections", {
        provider: app.id,
        ...formData
      });
      
      toast({
        title: "Integration connected",
        description: `${app.name} has been successfully connected.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/settings/integrations/connections'] });
      onClose();
    } catch (error) {
      toast({
        title: "Failed to connect",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyWebhook = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Webhook URL copied",
      description: "The webhook URL has been copied to your clipboard.",
    });
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`/api/settings/integrations/connections/${app.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      toast({
        title: "Integration disconnected",
        description: `${app.name} has been disconnected successfully.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/settings/integrations/connections'] });
      onClose();
    } catch (error) {
      toast({
        title: "Failed to disconnect",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const getModalContent = () => {
    switch (app.type) {
      case 'oauth':
        return (
          <>
            <div className="flex items-center mb-6">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
                style={{ backgroundColor: app.backgroundColor || '#e2e8f0' }}
              >
                {app.iconUrl ? (
                  <img src={app.iconUrl} alt={app.name} className="w-6 h-6" />
                ) : (
                  <span className="text-white font-semibold">{app.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium">{isConnected ? `Manage ${app.name}` : `Connect ${app.name}`}</h3>
                <p className="text-sm text-muted-foreground">{app.description}</p>
              </div>
            </div>

            {isConnected ? (
              <div className="space-y-4">
                <Alert variant="success" className="bg-green-50 text-green-800 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    Your {app.name} account is currently connected.
                  </AlertDescription>
                </Alert>
                
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={handleDisconnect}
                  >
                    Disconnect {app.name}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm">
                  Connect your {app.name} account to enable contact synchronization and email sending capabilities.
                </p>
                
                <div className="flex justify-end">
                  <Button 
                    variant="default" 
                    className="w-full"
                    onClick={() => initiateGHLAuth()}
                  >
                    Authorize with {app.name}
                  </Button>
                </div>
              </div>
            )}
          </>
        );
      
      case 'apikey':
        return (
          <>
            <div className="flex items-center mb-6">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
                style={{ backgroundColor: app.backgroundColor || '#e2e8f0' }}
              >
                {app.iconUrl ? (
                  <img src={app.iconUrl} alt={app.name} className="w-6 h-6" />
                ) : (
                  <span className="text-white font-semibold">{app.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium">{isConnected ? `Manage ${app.name}` : `Connect ${app.name}`}</h3>
                <p className="text-sm text-muted-foreground">{app.description}</p>
              </div>
            </div>

            {isConnected ? (
              <div className="space-y-4">
                <Alert variant="success" className="bg-green-50 text-green-800 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    Your {app.name} API key is currently connected.
                  </AlertDescription>
                </Alert>
                
                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={handleDisconnect}
                  >
                    Disconnect {app.name}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setFormData({});
                    }}
                  >
                    Update API Key
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {app.configurationFields.map((field) => (
                  <div key={field.name}>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Input
                      id={field.name}
                      type={field.type}
                      required={field.required}
                      value={formData[field.name || ''] || ''}
                      onChange={(e) => handleInputChange(field.name || '', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                ))}
                
                <div className="flex justify-end">
                  <Button 
                    variant="default" 
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? "Connecting..." : "Connect API Key"}
                  </Button>
                </div>
              </div>
            )}
          </>
        );
      
      case 'webhook':
        // Generate a webhook URL with a user-specific token
        const webhookUrl = app.configurationFields[0]?.displayValue?.replace("{{USER_TOKEN}}", "user123456") || 
                         `https://${window.location.host}/api/webhooks/incoming/${app.id}/user123456`;
        
        return (
          <>
            <div className="flex items-center mb-6">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
                style={{ backgroundColor: app.backgroundColor || '#e2e8f0' }}
              >
                {app.iconUrl ? (
                  <img src={app.iconUrl} alt={app.name} className="w-6 h-6" />
                ) : (
                  <span className="text-white font-semibold">{app.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium">Configure {app.name}</h3>
                <p className="text-sm text-muted-foreground">{app.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm">
                Use the webhook URL below to receive data from external services. Copy this URL and paste it into your {app.name} configuration.
              </p>
              
              <div>
                <Label>Your Webhook URL</Label>
                <div className="flex mt-1">
                  <Input
                    readOnly
                    value={webhookUrl}
                    className="rounded-r-none font-mono text-sm"
                  />
                  <Button 
                    variant="secondary"
                    className="rounded-l-none"
                    onClick={() => handleCopyWebhook(webhookUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Keep this URL private. Anyone with this URL can send data to your account.
                </AlertDescription>
              </Alert>
              
              {app.configurationFields.slice(1).map((field) => (
                <div key={field.name}>
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input
                    id={field.name}
                    type={field.type}
                    required={field.required}
                    value={formData[field.name || ''] || ''}
                    onChange={(e) => handleInputChange(field.name || '', e.target.value)}
                    className="mt-1"
                  />
                </div>
              ))}
              
              <div className="flex justify-end">
                <Button 
                  variant="default" 
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? "Saving..." : "Save Webhook Configuration"}
                </Button>
              </div>
            </div>
          </>
        );
      
      default:
        return (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Unsupported Integration Type</h3>
            <p className="text-muted-foreground">
              The integration type "{app.type}" is not currently supported.
            </p>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        {getModalContent()}
      </DialogContent>
    </Dialog>
  );
};

export default IntegrationConfigModal;
