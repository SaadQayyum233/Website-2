import { useToast } from "@/hooks/use-toast";
import { useState } from 'react';

interface UseGHLAuthReturn {
  initiateGHLAuth: () => void;
  isAuthenticating: boolean;
}

const useGHLAuth = (): UseGHLAuthReturn => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { toast } = useToast();

  const initiateGHLAuth = () => {
    setIsAuthenticating(true);
    
    try {
      // Open GHL OAuth URL
      const authUrl = `/api/auth/ghl`;
      
      // Determine how to handle the redirect
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      // Try to open a popup first
      const popup = window.open(
        authUrl,
        "ghl-auth",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
      );
      
      // If popup is blocked or null, redirect user directly
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups to authenticate with GoHighLevel or click again to redirect.",
          variant: "destructive",
        });
        
        // If they click again, do direct redirect
        setTimeout(() => {
          window.location.href = authUrl;
        }, 1500);
      }
      
      // Set up message listener to handle popup communication
      const messageHandler = (event: MessageEvent) => {
        if (event.data && event.data.type === 'ghl-auth-success') {
          window.removeEventListener('message', messageHandler);
          setIsAuthenticating(false);
          toast({
            title: "GoHighLevel Connected",
            description: "Your GHL account was successfully connected.",
            variant: "success",
          });
        } else if (event.data && event.data.type === 'ghl-auth-error') {
          window.removeEventListener('message', messageHandler);
          setIsAuthenticating(false);
          toast({
            title: "Connection Failed",
            description: event.data.message || "Failed to connect to GoHighLevel.",
            variant: "destructive",
          });
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Cleanup if user closes popup
      const checkPopupInterval = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(checkPopupInterval);
          window.removeEventListener('message', messageHandler);
          setIsAuthenticating(false);
        }
      }, 1000);
      
    } catch (error) {
      setIsAuthenticating(false);
      toast({
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "Failed to start GoHighLevel authentication",
        variant: "destructive",
      });
    }
  };

  return { initiateGHLAuth, isAuthenticating };
};

export default useGHLAuth;
