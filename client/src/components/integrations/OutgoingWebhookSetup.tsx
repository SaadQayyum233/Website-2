import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Interface for trigger event options
interface TriggerEvent {
  id: string;
  name: string;
  description: string;
}

// Interface for data field options (contact fields, email properties, etc)
interface DataField {
  id: string;
  name: string;
  type: string;
  path: string;
}

// Default data fields available in the application
const DEFAULT_DATA_FIELDS: DataField[] = [
  { id: 'contact_email', name: 'Contact Email', type: 'string', path: 'contact.email' },
  { id: 'contact_name', name: 'Contact Name', type: 'string', path: 'contact.name' },
  { id: 'contact_id', name: 'Contact ID', type: 'number', path: 'contact.id' },
  { id: 'contact_ghl_id', name: 'Contact GHL ID', type: 'string', path: 'contact.ghl_id' },
  { id: 'contact_tags', name: 'Contact Tags', type: 'array', path: 'contact.tags' },
  { id: 'email_subject', name: 'Email Subject', type: 'string', path: 'email.subject' },
  { id: 'email_body', name: 'Email Body', type: 'string', path: 'email.body_text' },
  { id: 'event_type', name: 'Event Type', type: 'string', path: 'event.type' },
  { id: 'event_timestamp', name: 'Event Timestamp', type: 'date', path: 'event.timestamp' },
];

// Default trigger events
const DEFAULT_TRIGGER_EVENTS: TriggerEvent[] = [
  { id: 'contact_created', name: 'Contact Created', description: 'Triggered when a new contact is created' },
  { id: 'contact_updated', name: 'Contact Updated', description: 'Triggered when a contact is updated' },
  { id: 'email_sent', name: 'Email Sent', description: 'Triggered when an email is sent' },
  { id: 'email_opened', name: 'Email Opened', description: 'Triggered when an email is opened' },
  { id: 'email_clicked', name: 'Email Clicked', description: 'Triggered when a link in an email is clicked' },
  { id: 'manual_trigger', name: 'Manual Trigger', description: 'Triggered manually through the UI or API' },
];

// Form schema for outgoing webhook
const outgoingWebhookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  trigger_event: z.string().min(1, "Trigger event is required"),
  target_url: z.string().url("Must be a valid URL"),
  http_method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
  headers: z.array(z.object({
    key: z.string().min(1, "Header name is required"),
    value: z.string()
  })).optional(),
  selected_fields: z.array(z.string()).min(1, "At least one data field must be selected"),
  payload_template: z.string().optional(),
});

type OutgoingWebhookFormValues = z.infer<typeof outgoingWebhookSchema>;

interface OutgoingWebhookSetupProps {
  isOpen: boolean;
  onClose: () => void;
  existingWebhook?: any; // Type for existing outgoing webhook config if editing
}

export function OutgoingWebhookSetup({ isOpen, onClose, existingWebhook }: OutgoingWebhookSetupProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>("configuration");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  
  // Initialize form with default values or existing webhook values
  const form = useForm<OutgoingWebhookFormValues>({
    resolver: zodResolver(outgoingWebhookSchema),
    defaultValues: existingWebhook || {
      name: "",
      description: "",
      trigger_event: "",
      target_url: "",
      http_method: "POST",
      headers: [{ key: "Content-Type", value: "application/json" }],
      selected_fields: [],
      payload_template: JSON.stringify({
        event_type: "{event.type}",
        timestamp: "{event.timestamp}",
        data: {
          contact_id: "{contact.id}",
          email: "{contact.email}",
          name: "{contact.name}"
        }
      }, null, 2),
    },
  });

  // Add a header field
  const addHeader = () => {
    const currentHeaders = form.getValues("headers") || [];
    form.setValue("headers", [...currentHeaders, { key: "", value: "" }]);
  };

  // Remove a header field
  const removeHeader = (index: number) => {
    const currentHeaders = form.getValues("headers") || [];
    form.setValue("headers", currentHeaders.filter((_, i) => i !== index));
  };

  // Toggle field selection
  const toggleFieldSelection = (fieldId: string) => {
    const currentSelected = form.getValues("selected_fields") || [];
    
    if (currentSelected.includes(fieldId)) {
      const updated = currentSelected.filter(id => id !== fieldId);
      form.setValue("selected_fields", updated);
      setSelectedFields(updated);
    } else {
      const updated = [...currentSelected, fieldId];
      form.setValue("selected_fields", updated);
      setSelectedFields(updated);
    }
  };

  // Auto-generate payload template based on selected fields
  const generatePayloadTemplate = () => {
    const fields = form.getValues("selected_fields") || [];
    
    if (fields.length === 0) {
      return;
    }
    
    const templateObj: Record<string, any> = {
      event_type: "{event.type}",
      timestamp: "{event.timestamp}",
      data: {}
    };
    
    // Add selected fields to template
    fields.forEach(fieldId => {
      const field = DEFAULT_DATA_FIELDS.find(f => f.id === fieldId);
      if (field) {
        const pathParts = field.path.split('.');
        
        if (pathParts[0] === 'contact') {
          if (!templateObj.data.contact) {
            templateObj.data.contact = {};
          }
          templateObj.data.contact[pathParts[1]] = `{${field.path}}`;
        } else if (pathParts[0] === 'email') {
          if (!templateObj.data.email) {
            templateObj.data.email = {};
          }
          templateObj.data.email[pathParts[1]] = `{${field.path}}`;
        } else {
          templateObj.data[field.id] = `{${field.path}}`;
        }
      }
    });
    
    form.setValue("payload_template", JSON.stringify(templateObj, null, 2));
  };

  // Save the outgoing webhook configuration
  const onSubmit = async (values: OutgoingWebhookFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Format data for API
      const webhookData = {
        ...values,
        id: existingWebhook?.id,
        type: 'outgoing',
        user_id: 1, // Default to user 1 for development
      };
      
      console.log("Saving webhook with data:", webhookData);
      
      // Call API to save webhook with correct path
      const endpoint = existingWebhook ? 
        `/api/webhooks/${existingWebhook.id}` : 
        '/api/webhooks';
      
      const method = existingWebhook ? 'PUT' : 'POST';
      
      const response = await apiRequest(method, endpoint, webhookData);
      console.log("Webhook save response:", response);
      
      if (response && response.success) {
        toast({
          title: existingWebhook ? "Webhook Updated" : "Webhook Created",
          description: `Outgoing webhook has been successfully ${existingWebhook ? 'updated' : 'created'}.`,
        });
        onClose();
      } else {
        throw new Error((response && response.message) || 'Unknown error occurred');
      }
    } catch (error) {
      console.error("Error saving webhook:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save webhook configuration",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{existingWebhook ? 'Edit Outgoing Webhook' : 'Configure Outgoing Webhook'}</DialogTitle>
          <DialogDescription>
            Set up an outgoing webhook to send data to external systems when specific events occur
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-4">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="payload">Payload Builder</TabsTrigger>
              <TabsTrigger value="headers">Headers</TabsTrigger>
            </TabsList>
            
            <Form {...form}>
              <form id="webhook-form" onSubmit={form.handleSubmit(onSubmit)}>
                <TabsContent value="configuration" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook Name</FormLabel>
                        <FormControl>
                          <Input placeholder="My Outgoing Webhook" {...field} />
                        </FormControl>
                        <FormDescription>
                          A name to identify this outgoing webhook
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the purpose of this webhook" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="trigger_event"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trigger Event</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select when this webhook should trigger" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DEFAULT_TRIGGER_EVENTS.map(event => (
                              <SelectItem key={event.id} value={event.id}>
                                {event.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose when this webhook should be triggered
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="target_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.example.com/webhook" {...field} />
                        </FormControl>
                        <FormDescription>
                          The URL where the webhook data will be sent
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="http_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HTTP Method</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select HTTP method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {["GET", "POST", "PUT", "DELETE", "PATCH"].map(method => (
                              <SelectItem key={method} value={method}>
                                {method}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The HTTP method to use when sending the request
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="payload" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Available Data Fields</h4>
                      <Card>
                        <CardContent className="p-4 h-[300px] overflow-y-auto">
                          <div className="space-y-2">
                            {DEFAULT_DATA_FIELDS.map(field => {
                              const isSelected = form.watch("selected_fields")?.includes(field.id);
                              return (
                                <div 
                                  key={field.id} 
                                  className={`flex items-center justify-between p-2 rounded border cursor-pointer ${
                                    isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                                  }`}
                                  onClick={() => toggleFieldSelection(field.id)}
                                >
                                  <div>
                                    <p className="text-sm font-medium">{field.name}</p>
                                    <p className="text-xs text-muted-foreground">{field.path}</p>
                                  </div>
                                  <Badge variant={field.type === 'string' ? 'default' : 'outline'}>
                                    {field.type}
                                  </Badge>
                                  {isSelected && <Check className="h-4 w-4 text-primary ml-2" />}
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2 w-full"
                        onClick={generatePayloadTemplate}
                      >
                        Generate Payload Template
                      </Button>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Payload Template</h4>
                      <FormField
                        control={form.control}
                        name="payload_template"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                className="font-mono h-[340px]" 
                                placeholder={`{\n  "event": "{event.type}",\n  "data": {\n    "email": "{contact.email}"\n  }\n}`}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Define the JSON structure that will be sent in the webhook
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="headers" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium">HTTP Headers</h4>
                      <Button type="button" variant="outline" size="sm" onClick={addHeader}>
                        <Plus className="h-4 w-4 mr-1" /> Add Header
                      </Button>
                    </div>
                    
                    {form.watch("headers")?.map((_, index) => (
                      <div key={index} className="flex space-x-2">
                        <FormField
                          control={form.control}
                          name={`headers.${index}.key`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input placeholder="Header Name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`headers.${index}.value`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input placeholder="Header Value" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeHeader(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {(!form.watch("headers") || form.watch("headers").length === 0) && (
                      <div className="text-center py-4 text-muted-foreground">
                        No headers defined yet. Click "Add Header" to define HTTP headers for your request.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </form>
            </Form>
          </Tabs>
        </ScrollArea>
        
        <DialogFooter className="pt-4 mt-6 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            form="webhook-form"
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingWebhook ? 'Update Webhook' : 'Save Webhook'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}