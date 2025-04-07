import React, { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  useQuery
} from "@tanstack/react-query";
import { FlaskRound, Sparkles, AlertTriangle, Info } from "lucide-react";

const schema = z.object({
  count: z.number().min(2, "At least 2 variants are required").max(5, "Maximum 5 variants allowed"),
});

interface ExperimentControlsProps {
  email: {
    id: number;
    name: string;
    subject: string;
    key_angle?: string;
  };
  onGenerate: (count: number) => void;
}

const ExperimentControls: React.FC<ExperimentControlsProps> = ({ email, onGenerate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if OpenAI is connected
  const { data: connections = [] } = useQuery({
    queryKey: ['/api/settings/integrations/connections'],
  });
  
  const isOpenAIConnected = connections.some((conn: any) => 
    conn.provider === 'openai' && conn.connected
  );

  // Check if Avatar and ICP settings are completed
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
  });
  
  const avatarCompleted = !!settings?.avatar_name;
  const icpCompleted = !!settings?.icp_description;

  // Form initialization
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      count: 3,
    },
  });

  const handleSubmit = async (data: z.infer<typeof schema>) => {
    setIsSubmitting(true);
    try {
      await onGenerate(data.count);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2 flex items-center">
          <FlaskRound className="inline-block mr-2 h-5 w-5" />
          Generate Email Variants
        </h3>
        <p className="text-sm text-muted-foreground">
          Create AI-powered variations of "{email.name}" using OpenAI
        </p>
        
        <Separator className="my-4" />
        
        <div className="mb-4">
          <h4 className="font-medium">Base Email</h4>
          <div className="mt-2 text-sm">
            <p><span className="text-muted-foreground">Subject:</span> {email.subject}</p>
            {email.key_angle && (
              <p><span className="text-muted-foreground">Key Angle:</span> {email.key_angle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card className={isOpenAIConnected ? 'border-green-200' : 'border-red-200'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Sparkles className="h-4 w-4 mr-2" />
              OpenAI Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {isOpenAIConnected 
                ? "OpenAI is connected and ready to generate variants" 
                : "OpenAI connection is required for this feature"}
            </p>
          </CardContent>
          {!isOpenAIConnected && (
            <CardFooter>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = "/settings/integrations"}
                className="w-full text-sm"
              >
                Connect OpenAI
              </Button>
            </CardFooter>
          )}
        </Card>

        <Card className={(avatarCompleted && icpCompleted) ? 'border-green-200' : 'border-amber-200'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Info className="h-4 w-4 mr-2" />
              User Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {avatarCompleted && icpCompleted
                ? "Avatar and ICP profiles completed"
                : "Complete your profiles for better AI results"}
            </p>
          </CardContent>
          {(!avatarCompleted || !icpCompleted) && (
            <CardFooter>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = "/settings/profile"}
                className="w-full text-sm"
              >
                Complete Profiles
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {!isOpenAIConnected ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>OpenAI Connection Required</AlertTitle>
          <AlertDescription>
            Please connect your OpenAI account in the Integrations settings before generating variants.
          </AlertDescription>
          <Button 
            variant="outline" 
            className="mt-3"
            onClick={() => window.location.href = "/settings/integrations"}
          >
            Go to Integrations
          </Button>
        </Alert>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Variants</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={2} 
                      max={5} 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    How many different email variations to generate (2-5 recommended)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                The AI will generate variations with different angles, tones, and persuasion techniques
                based on your Avatar and ICP profiles.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-3">
              <Button 
                type="submit" 
                disabled={isSubmitting || !isOpenAIConnected}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isSubmitting ? "Generating..." : "Generate Variants"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};

export default ExperimentControls;
