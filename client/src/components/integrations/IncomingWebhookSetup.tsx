import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Copy, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define the schema for incoming webhook setup
const incomingWebhookSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().optional(),
  secretKey: z.string().min(10, { message: "Secret key must be at least 10 characters" }),
  enableAuthentication: z.boolean().default(true),
  eventHandling: z.array(z.string()).default([]),
  notificationEmail: z.string().email({ message: "Invalid email address" }).optional().or(z.literal("")),
});

// Type for form values
type IncomingWebhookFormValues = z.infer<typeof incomingWebhookSchema>;

// Available event types to handle
const availableEvents = [
  { id: "contact_created", label: "Contact Created" },
  { id: "contact_updated", label: "Contact Updated" },
  { id: "message_received", label: "Message Received" },
  { id: "deal_stage_updated", label: "Deal Stage Updated" },
  { id: "appointment_booked", label: "Appointment Booked" },
];

interface IncomingWebhookSetupProps {
  isOpen: boolean;
  onClose: () => void;
  existingWebhook?: any; // Type for existing incoming webhook config if editing
}

export function IncomingWebhookSetup({ isOpen, onClose, existingWebhook }: IncomingWebhookSetupProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [webhookCreated, setWebhookCreated] = useState(false);
  const [webhookEndpoint, setWebhookEndpoint] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Initialize form with existing webhook data or defaults
  const form = useForm<IncomingWebhookFormValues>({
    resolver: zodResolver(incomingWebhookSchema),
    defaultValues: existingWebhook || {
      name: "",
      description: "",
      secretKey: generateRandomKey(20),
      enableAuthentication: true,
      eventHandling: ["contact_created", "contact_updated"],
      notificationEmail: "",
    },
  });

  // Generate a random key for authentication
  function generateRandomKey(length: number): string {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*_-+=";
    let result = "";
    const charactersLength = characters.length;
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    
    return result;
  }

  // Copy webhook URL to clipboard
  const copyToClipboard = () => {
    if (webhookEndpoint) {
      navigator.clipboard.writeText(webhookEndpoint)
        .then(() => {
          setCopiedToClipboard(true);
          setTimeout(() => setCopiedToClipboard(false), 2000);
        })
        .catch(err => {
          console.error("Failed to copy to clipboard:", err);
          toast({
            title: "Copy failed",
            description: "Could not copy to clipboard",
            variant: "destructive",
          });
        });
    }
  };

  // Handle form submission
  const onSubmit = async (data: IncomingWebhookFormValues) => {
    setIsSubmitting(true);
    
    try {
      console.log("Submitting webhook config:", data);
      
      // Make an actual API call to create/update webhook
      const webhook = {
        type: "incoming",
        name: data.name,
        description: data.description || "",
        provider: data.provider || "custom",
        secret_key: data.secretKey || "",
        notification_email: data.notificationEmail || "",
        event_handling: data.eventHandling || []
      };
      
      const url = existingWebhook 
        ? `/api/webhooks/${existingWebhook.id}`
        : "/api/webhooks";
        
      const method = existingWebhook ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhook)
      });
      
      if (!response.ok) {
        throw new Error("Failed to create webhook");
      }
      
      const result = await response.json();
      console.log("Webhook API response:", result);
      
      // Generate the endpoint URL based on the webhook data
      const endpoint = result.webhook.endpoint_token 
        ? `${window.location.origin}/api/webhooks/incoming/${data.provider}/${result.webhook.endpoint_token}`
        : null;
        
      setWebhookEndpoint(endpoint);
      setWebhookCreated(true);
      
      toast({
        title: "Webhook configured",
        description: `Your incoming webhook ${data.name} has been successfully ${existingWebhook ? "updated" : "created"}.`,
      });
      
      setIsSubmitting(false);
      
    } catch (error) {
      console.error("Error creating webhook:", error);
      
      toast({
        title: "Error",
        description: "Failed to configure webhook. Please try again.",
        variant: "destructive",
      });
      
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{existingWebhook ? "Edit Incoming Webhook" : "Create Incoming Webhook"}</DialogTitle>
          <DialogDescription>
            Set up a webhook to receive data from external services
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-4">
          {webhookCreated ? (
            <div className="space-y-4 py-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Webhook Created Successfully</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your webhook is now ready to receive data. Use the endpoint URL below in your external service.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-1">Webhook Endpoint URL</h3>
                  <div className="flex items-center">
                    <div className="bg-muted p-2 px-3 rounded-l-md border border-r-0 flex-1 text-sm font-mono truncate">
                      {webhookEndpoint}
                    </div>
                    <Button
                      size="icon"
                      className="rounded-l-none h-9"
                      onClick={copyToClipboard}
                      variant="secondary"
                    >
                      {copiedToClipboard ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-1">Security Credentials</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Include this secret key in your requests to authenticate them:
                  </p>
                  <div className="bg-muted p-2 rounded-md border text-sm font-mono">
                    {form.getValues("secretKey")}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Usage Instructions</h3>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>1. Configure your external service to send data to the webhook URL above.</p>
                    <p>2. Add the secret key as an <code className="text-xs bg-muted-foreground/20 rounded px-1">X-Webhook-Secret</code> header in your requests.</p>
                    <p>3. Send data in JSON format with a POST request.</p>
                    <p>4. Test your webhook by sending a sample request.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form id="incoming-webhook-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., GHL Contact Sync" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name to identify this webhook
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What does this webhook do?" 
                          className="resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Brief description of what this webhook is used for
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="enableAuthentication"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Require Authentication</FormLabel>
                        <FormDescription>
                          Validate incoming requests with a secret key
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
                
                {form.watch("enableAuthentication") && (
                  <FormField
                    control={form.control}
                    name="secretKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secret Key</FormLabel>
                        <FormControl>
                          <div className="flex space-x-2">
                            <Input
                              {...field}
                              type="text"
                              className="font-mono"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                const newKey = generateRandomKey(20);
                                form.setValue("secretKey", newKey);
                              }}
                            >
                              Regenerate
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          This secret key must be included in requests to authenticate them
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <div className="space-y-3">
                  <FormLabel className="text-base">Events to Handle</FormLabel>
                  <FormDescription>
                    Select which events this webhook should process
                  </FormDescription>
                  
                  <div className="grid gap-2">
                    {availableEvents.map((event) => (
                      <FormField
                        key={event.id}
                        control={form.control}
                        name="eventHandling"
                        render={({ field }) => (
                          <FormItem
                            key={event.id}
                            className={cn(
                              "flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3"
                            )}
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(event.id)}
                                onCheckedChange={(checked) => {
                                  const currentValues = field.value || [];
                                  if (checked) {
                                    field.onChange([...currentValues, event.id]);
                                  } else {
                                    field.onChange(
                                      currentValues.filter((value) => value !== event.id)
                                    );
                                  }
                                }}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal">
                                {event.label}
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="notificationEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notification Email (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Email to notify when webhook is received" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Receive notifications when this webhook is triggered
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          )}
        </ScrollArea>
        
        <DialogFooter className="pt-4 mt-6 border-t">
          {webhookCreated ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button 
                form="incoming-webhook-form"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {existingWebhook ? "Update Webhook" : "Create Webhook"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}