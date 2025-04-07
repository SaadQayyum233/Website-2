import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IntegrationSetupWizard from "./IntegrationSetupWizard";
import { OutgoingWebhookSetup } from "./OutgoingWebhookSetup";
import { IncomingWebhookSetup } from "./IncomingWebhookSetup";

interface WebhookSetupSelectorProps {
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

export default function WebhookSetupSelector({ 
  buttonText = "Add Webhook", 
  buttonVariant = "default" 
}: WebhookSetupSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>("incoming");
  const [showIncomingSetup, setShowIncomingSetup] = useState(false);
  const [showOutgoingSetup, setShowOutgoingSetup] = useState(false);
  
  // Handle incoming webhook setup completion
  const handleIncomingWebhookClose = () => {
    setShowIncomingSetup(false);
  };
  
  // Handle outgoing webhook setup completion
  const handleOutgoingWebhookClose = () => {
    setShowOutgoingSetup(false);
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant={buttonVariant}>{buttonText}</Button>
        </DialogTrigger>
        
        <DialogContent className="p-0 max-w-4xl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Webhook Setup</DialogTitle>
            <DialogDescription>
              Choose the type of webhook you want to configure
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full px-6">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="incoming">Incoming Webhook (Receive Data)</TabsTrigger>
              <TabsTrigger value="outgoing">Outgoing Webhook (Send Data)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="incoming" className="mt-0">
              <div className="p-4 bg-muted/30 rounded-md mb-6">
                <h3 className="text-sm font-medium mb-1">About Incoming Webhooks</h3>
                <p className="text-xs text-muted-foreground">
                  Incoming webhooks let external systems send data to your application. 
                  Use this to receive notifications, updates, or data from other services.
                </p>
              </div>
              
              {/* Close this dialog when the Wizard is opened */}
              <div className="pb-6">
                <Button 
                  onClick={() => {
                    setIsOpen(false);
                    // Small delay to prevent UI flash
                    setTimeout(() => {
                      setShowIncomingSetup(true);
                    }, 100);
                  }}
                >
                  Configure Incoming Webhook
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="outgoing" className="mt-0">
              <div className="p-4 bg-muted/30 rounded-md mb-6">
                <h3 className="text-sm font-medium mb-1">About Outgoing Webhooks</h3>
                <p className="text-xs text-muted-foreground">
                  Outgoing webhooks send data from your application to external systems.
                  Use this to notify other services when events happen in your application.
                </p>
              </div>
              
              <div className="pb-6">
                <Button 
                  onClick={() => {
                    setIsOpen(false);
                    // Small delay to prevent UI flash
                    setTimeout(() => {
                      setShowOutgoingSetup(true);
                    }, 100);
                  }}
                >
                  Configure Outgoing Webhook
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Render the corresponding webhook setup components */}
      <IncomingWebhookSetup
        isOpen={showIncomingSetup}
        onClose={handleIncomingWebhookClose}
        existingWebhook={null}
      />
      
      <OutgoingWebhookSetup
        isOpen={showOutgoingSetup}
        onClose={handleOutgoingWebhookClose}
        existingWebhook={null}
      />
    </>
  );
}