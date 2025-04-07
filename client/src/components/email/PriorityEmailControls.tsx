import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tag, AlertTriangle, Send } from "lucide-react";

const schema = z.object({
  tag: z.string().min(1, "Tag is required"),
});

interface PriorityEmailControlsProps {
  email: {
    id: number;
    name: string;
    subject: string;
    start_date?: string;
    end_date?: string;
  };
  onSend: (tag: string) => void;
}

const PriorityEmailControls: React.FC<PriorityEmailControlsProps> = ({ email, onSend }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomTag, setShowCustomTag] = useState(false);

  // Fetch contacts for tag suggestions
  const { data: contacts = [] } = useQuery({
    queryKey: ['/api/contacts'],
  });

  // Extract unique tags from contacts
  const uniqueTags = React.useMemo(() => {
    const allTags = contacts.flatMap((contact: any) => contact.tags || []);
    return Array.from(new Set(allTags)).filter(Boolean);
  }, [contacts]);

  // Form initialization
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      tag: "",
    },
  });

  const handleSubmit = async (data: z.infer<typeof schema>) => {
    setIsSubmitting(true);
    try {
      await onSend(data.tag);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2 flex items-center">
          <Send className="inline-block mr-2 h-5 w-5" />
          Send Priority Email
        </h3>
        <p className="text-sm text-muted-foreground">
          Send "{email.name}" to contacts with a specific tag
        </p>
        
        <Separator className="my-4" />
        
        <div className="mb-4">
          <h4 className="font-medium">Email Details</h4>
          <div className="mt-2 text-sm">
            <p><span className="text-muted-foreground">Subject:</span> {email.subject}</p>
            {email.start_date && (
              <p><span className="text-muted-foreground">Start Date:</span> {new Date(email.start_date).toLocaleDateString()}</p>
            )}
            {email.end_date && (
              <p><span className="text-muted-foreground">End Date:</span> {new Date(email.end_date).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          This will immediately send the email to all contacts with the specified tag. 
          Please ensure you've selected the correct tag before proceeding.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {!showCustomTag && uniqueTags.length > 0 ? (
            <FormField
              control={form.control}
              name="tag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Tag</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tag" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {uniqueTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          <div className="flex items-center">
                            <Tag className="mr-2 h-3.5 w-3.5" />
                            {tag}
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__" onClick={() => setShowCustomTag(true)}>
                        + Enter Custom Tag
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select a tag to target specific contacts
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="tag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enter Tag</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="priority_group_a" {...field} />
                    </FormControl>
                    {uniqueTags.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowCustomTag(false);
                          form.setValue("tag", "");
                        }}
                      >
                        Choose Existing
                      </Button>
                    )}
                  </div>
                  <FormDescription>
                    Enter the tag name that identifies your target contacts
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="flex justify-end gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PriorityEmailControls;
