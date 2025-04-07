import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { User, AlertCircle, Send, UserCircle, Users } from "lucide-react";

// Define schema for Avatar settings
const avatarFormSchema = z.object({
  avatar_name: z.string().min(1, "Name is required"),
  avatar_role: z.string().optional(),
  avatar_company_name: z.string().optional(),
  avatar_bio: z.string().optional(),
  avatar_inspiration_name: z.string().optional(),
  avatar_website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  email_signature_html: z.string().optional(),
});

// Define schema for ICP settings
const icpFormSchema = z.object({
  icp_description: z.string().optional(),
  icp_pain_points: z.string().optional(),
  icp_fears: z.string().optional(),
  icp_insecurities: z.string().optional(),
  icp_transformations: z.string().optional(),
  icp_key_objectives: z.string().optional(),
});

// Combined type for user settings
type UserSettings = z.infer<typeof avatarFormSchema> & z.infer<typeof icpFormSchema> & {
  id?: number;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
};

const ProfileSettingsPage = () => {
  const { toast } = useToast();
  
  // Fetch user settings
  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ['/api/settings'],
  });

  // Avatar form
  const avatarForm = useForm<z.infer<typeof avatarFormSchema>>({
    resolver: zodResolver(avatarFormSchema),
    defaultValues: {
      avatar_name: "",
      avatar_role: "",
      avatar_company_name: "",
      avatar_bio: "",
      avatar_inspiration_name: "",
      avatar_website: "",
      email_signature_html: "",
    },
  });

  // ICP form
  const icpForm = useForm<z.infer<typeof icpFormSchema>>({
    resolver: zodResolver(icpFormSchema),
    defaultValues: {
      icp_description: "",
      icp_pain_points: "",
      icp_fears: "",
      icp_insecurities: "",
      icp_transformations: "",
      icp_key_objectives: "",
    },
  });

  // Update forms when settings are loaded
  React.useEffect(() => {
    if (settings) {
      avatarForm.reset({
        avatar_name: settings.avatar_name || "",
        avatar_role: settings.avatar_role || "",
        avatar_company_name: settings.avatar_company_name || "",
        avatar_bio: settings.avatar_bio || "",
        avatar_inspiration_name: settings.avatar_inspiration_name || "",
        avatar_website: settings.avatar_website || "",
        email_signature_html: settings.email_signature_html || "",
      });
      
      icpForm.reset({
        icp_description: settings.icp_description || "",
        icp_pain_points: settings.icp_pain_points || "",
        icp_fears: settings.icp_fears || "",
        icp_insecurities: settings.icp_insecurities || "",
        icp_transformations: settings.icp_transformations || "",
        icp_key_objectives: settings.icp_key_objectives || "",
      });
    }
  }, [settings]);

  // Handle avatar form submission
  const onAvatarSubmit = async (data: z.infer<typeof avatarFormSchema>) => {
    try {
      await apiRequest("PUT", "/api/settings", data);
      
      toast({
        title: "Avatar settings saved",
        description: "Your personal brand settings have been updated successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    } catch (error) {
      toast({
        title: "Failed to save settings",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Handle ICP form submission
  const onICPSubmit = async (data: z.infer<typeof icpFormSchema>) => {
    try {
      await apiRequest("PUT", "/api/settings", data);
      
      toast({
        title: "ICP settings saved",
        description: "Your ideal customer profile settings have been updated successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    } catch (error) {
      toast({
        title: "Failed to save settings",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">User Profile</h1>
        <p className="text-muted-foreground">
          Configure your personal brand and ideal customer profile for AI-powered emails
        </p>
      </div>

      <div className="mb-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important for AI-Powered Features</AlertTitle>
          <AlertDescription>
            Complete your Avatar and ICP profiles to improve the quality of AI-generated email variants. 
            The more details you provide, the better the AI can personalize content to match your brand and target audience.
          </AlertDescription>
        </Alert>
      </div>

      <Tabs defaultValue="avatar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="avatar" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            Your Avatar
          </TabsTrigger>
          <TabsTrigger value="icp" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Ideal Customer Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="avatar">
          <Card>
            <CardHeader>
              <CardTitle>Your Avatar</CardTitle>
              <CardDescription>
                Define your personal brand identity used in email communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...avatarForm}>
                <form onSubmit={avatarForm.handleSubmit(onAvatarSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={avatarForm.control}
                      name="avatar_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Smith" {...field} />
                          </FormControl>
                          <FormDescription>
                            The name that will appear in the 'From' field of emails
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={avatarForm.control}
                      name="avatar_role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Role</FormLabel>
                          <FormControl>
                            <Input placeholder="CEO & Founder" {...field} />
                          </FormControl>
                          <FormDescription>
                            Your professional title or role
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={avatarForm.control}
                      name="avatar_company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Inc." {...field} />
                          </FormControl>
                          <FormDescription>
                            The company you represent
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={avatarForm.control}
                      name="avatar_website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            Your company or personal website
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={avatarForm.control}
                    name="avatar_bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="I help entrepreneurs build successful online businesses through proven marketing strategies..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          A brief description of who you are and what you do
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={avatarForm.control}
                    name="avatar_inspiration_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inspiration</FormLabel>
                        <FormControl>
                          <Input placeholder="Gary Vaynerchuk, Marie Forleo, etc." {...field} />
                        </FormControl>
                        <FormDescription>
                          Whose communication style inspires you? (AI will incorporate elements of their style)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={avatarForm.control}
                    name="email_signature_html"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Signature (HTML)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="<p>Jane Smith<br>CEO, Acme Inc.<br><a href='https://example.com'>example.com</a></p>"
                            className="min-h-[120px] font-mono text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          HTML signature to append to your emails (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" className="min-w-[150px]">
                      Save Avatar Settings
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="icp">
          <Card>
            <CardHeader>
              <CardTitle>Ideal Customer Profile (ICP)</CardTitle>
              <CardDescription>
                Define characteristics of your ideal customers to tailor AI-generated content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...icpForm}>
                <form onSubmit={icpForm.handleSubmit(onICPSubmit)} className="space-y-6">
                  <FormField
                    control={icpForm.control}
                    name="icp_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ICP Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="My ideal customers are small business owners aged 30-50 who struggle with digital marketing..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Detailed description of your ideal customer profile
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={icpForm.control}
                      name="icp_pain_points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pain Points</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Lack of time for marketing, inconsistent lead generation, overwhelmed by technology options..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            What problems do your customers struggle with?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={icpForm.control}
                      name="icp_fears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fears & Concerns</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Fear of business failure, wasting money on ineffective solutions, falling behind competitors..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            What fears or concerns drive their decisions?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={icpForm.control}
                      name="icp_insecurities"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insecurities</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Not tech-savvy enough, lack of marketing expertise, impostor syndrome in their industry..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            What insecurities might hold them back?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={icpForm.control}
                      name="icp_transformations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Desired Transformations</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Consistent lead generation, automated marketing systems, predictable revenue growth..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            What outcomes do they want to achieve?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={icpForm.control}
                    name="icp_key_objectives"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Key Objectives</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Increase revenue by 30%, reduce time spent on marketing, establish authority in their market..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          What specific measurable goals do they have?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" className="min-w-[150px]">
                      Save ICP Settings
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileSettingsPage;
