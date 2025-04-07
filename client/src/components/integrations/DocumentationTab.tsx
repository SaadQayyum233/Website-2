import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, AlertCircle, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Documentation {
  id: string;
  title: string;
  sections: {
    title: string;
    content: string;
  }[];
}

export const DocumentationTab = () => {
  const { toast } = useToast();
  const [activeTabId, setActiveTabId] = useState<string>('');

  // Fetch available documentation
  const { data: docs, isLoading, error } = useQuery({
    queryKey: ['/api/integrations/documentation'],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", '/api/integrations/documentation');
        if (response && response.data) {
          return response.data as Documentation[];
        }
        return [];
      } catch (err) {
        console.error("Error fetching documentation:", err);
        throw new Error("Failed to fetch documentation");
      }
    },
  });

  // Set default active tab on data load
  useEffect(() => {
    if (docs && docs.length > 0 && !activeTabId) {
      setActiveTabId(docs[0].id);
    }
  }, [docs, activeTabId]);

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The value has been copied to your clipboard.",
    });
  };

  // Format content with code blocks, links, and other rich elements
  const formatContent = (content: string) => {
    // Split on markdown-style code blocks
    const parts = content.split(/(\`\`\`.*?\`\`\`|\`.*?\`)/g);
    
    return parts.map((part, index) => {
      // Code block (triple backticks)
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.substring(3, part.length - 3);
        return (
          <div key={index} className="relative my-3">
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto font-mono whitespace-pre-wrap">
              {code}
            </pre>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 bg-muted-foreground/10 hover:bg-muted-foreground/20"
              onClick={() => copyToClipboard(code)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        );
      }
      
      // Inline code (single backticks)
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
            {part.substring(1, part.length - 1)}
          </code>
        );
      }
      
      // Normal text - process links
      const processedText = part.split(/(\[.*?\]\(.*?\))/g).map((fragment, i) => {
        // Markdown links [title](url)
        if (fragment.match(/\[(.*?)\]\((.*?)\)/)) {
          const title = fragment.match(/\[(.*?)\]/)?.[1] || '';
          const url = fragment.match(/\((.*?)\)/)?.[1] || '#';
          
          return (
            <a 
              key={`link-${i}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center"
            >
              {title}
              <ExternalLink className="h-3 w-3 ml-0.5" />
            </a>
          );
        }
        
        // Process headers (## Header)
        if (fragment.trim().startsWith('## ')) {
          return (
            <h3 key={`h3-${i}`} className="text-lg font-semibold mt-4 mb-2">
              {fragment.trim().substring(3)}
            </h3>
          );
        }
        
        // Process subheaders (### Subheader)
        if (fragment.trim().startsWith('### ')) {
          return (
            <h4 key={`h4-${i}`} className="text-base font-medium mt-3 mb-1">
              {fragment.trim().substring(4)}
            </h4>
          );
        }
        
        // Normal text (split by newlines to create paragraphs)
        return fragment.split(/\n\s*\n/).map((para, paraIndex) => 
          para.trim() ? (
            <p key={`p-${i}-${paraIndex}`} className="my-2">
              {para.trim().split('\n').map((line, lineIndex) => (
                <span key={`line-${i}-${paraIndex}-${lineIndex}`}>
                  {line}
                  {lineIndex < para.trim().split('\n').length - 1 && <br />}
                </span>
              ))}
            </p>
          ) : null
        );
      });
      
      return <span key={index}>{processedText}</span>;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="w-full animate-pulse">
          <div className="h-8 bg-muted rounded mb-4 w-1/3"></div>
          <div className="h-24 bg-muted rounded mb-2"></div>
          <div className="h-24 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !docs || docs.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Documentation Unavailable</AlertTitle>
        <AlertDescription>
          Could not load the integration documentation. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-muted/30 p-4 rounded-md border mb-8">
        <h2 className="text-lg font-semibold mb-2 flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-primary" />
          Integration Documentation
        </h2>
        <p className="text-sm text-muted-foreground">
          These guides help you set up and use our integrations. Select an integration below to view its documentation.
        </p>
      </div>
    
      <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
        <div className="flex flex-col sm:flex-row gap-8">
          {/* Sidebar with integration selection */}
          <div className="w-full sm:w-64 flex-shrink-0">
            <div className="sticky top-4">
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">Select Integration</h3>
              <TabsList className="flex flex-col h-auto bg-transparent space-y-1">
                {docs.map((doc) => (
                  <TabsTrigger 
                    key={doc.id} 
                    value={doc.id}
                    className={cn(
                      "justify-start px-3 py-2 h-auto font-normal text-left",
                      activeTabId === doc.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    {doc.title}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>
          
          {/* Documentation content */}
          <div className="flex-grow">
            {docs.map((doc) => (
              <TabsContent key={doc.id} value={doc.id} className="mt-0 space-y-6 border-0 p-0">
                <div className="space-y-1 mb-6">
                  <h2 className="text-2xl font-semibold">{doc.title}</h2>
                  <p className="text-muted-foreground">Learn how to set up and use the {doc.title}.</p>
                </div>
                
                <div className="space-y-6">
                  {doc.sections.map((section, index) => (
                    <Card key={index} className={cn(
                      "overflow-hidden border",
                      section.title.toLowerCase().includes("webhook") && "border-blue-200"
                    )}>
                      <CardHeader className={cn(
                        "py-4",
                        section.title.toLowerCase().includes("webhook") && "bg-blue-50",
                        section.title.toLowerCase() === "overview" && "bg-slate-50",
                        section.title.toLowerCase().includes("troubleshooting") && "bg-amber-50"
                      )}>
                        <CardTitle className="text-lg flex items-center">
                          {section.title.toLowerCase().includes("webhook") && (
                            <AlertCircle className="h-4 w-4 mr-2 text-blue-600" />
                          )}
                          {section.title.toLowerCase() === "overview" && (
                            <BookOpen className="h-4 w-4 mr-2 text-slate-600" />
                          )}
                          {section.title.toLowerCase().includes("troubleshooting") && (
                            <AlertCircle className="h-4 w-4 mr-2 text-amber-600" />
                          )}
                          {section.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 prose prose-slate max-w-none prose-headings:font-semibold prose-headings:text-slate-900 prose-h3:text-lg prose-h4:text-base prose-h3:font-medium prose-h4:font-medium prose-p:text-slate-600 prose-pre:bg-slate-100 prose-pre:text-slate-800">
                        {formatContent(section.content)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default DocumentationTab;