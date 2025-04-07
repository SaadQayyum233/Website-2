import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  Mail,
  BarChart2,
  TrendingUp,
  FlaskRound,
  Sliders,
  User,
  RefreshCw,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Toast variants are handled directly in component

const Sidebar: React.FC = () => {
  const [location] = useLocation();
  const { toast } = useToast();

  const handleRefreshData = async () => {
    try {
      toast({
        title: "Syncing contacts...",
        description: "This might take a minute.",
      });
      
      await apiRequest("POST", "/api/ghl/sync-contacts");
      
      toast({
        title: "Contacts synced successfully",
        description: "Your contact list has been updated.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync contacts",
        variant: "destructive",
      });
    }
  };

  const NavItem = ({
    to,
    icon: Icon,
    label,
  }: {
    to: string;
    icon: React.ElementType;
    label: string;
  }) => {
    const isActive = location === to;
    
    return (
      <Link 
        href={to}
        className={cn(
          "flex items-center px-4 py-3 text-sm rounded-md",
          "hover:bg-opacity-5 hover:bg-white transition-colors",
          isActive
            ? "bg-opacity-10 bg-white text-primary border-l-3 border-primary"
            : "text-sidebar-foreground"
        )}
      >
        <Icon className="w-5 h-5 mr-3" />
        {label}
      </Link>
    );
  };

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex flex-col">
      {/* App Logo */}
      <div className="px-4 py-6 border-b border-sidebar-border flex items-center">
        <Mail className="w-8 h-8 text-primary" />
        <span className="ml-2 text-xl font-semibold">EmailFlow</span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-4 mb-2">
          <NavItem to="/" icon={Home} label="Dashboard" />
        </div>

        <div className="mt-6">
          <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            DATA MANAGEMENT
          </h3>
          <div className="mt-3 px-4">
            <NavItem to="/contacts" icon={Users} label="Contacts" />
            <NavItem to="/emails" icon={Mail} label="Emails" />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            ANALYTICS
          </h3>
          <div className="mt-3 px-4">
            <NavItem to="/analytics/statistics" icon={BarChart2} label="Statistics" />
            <NavItem to="/analytics/performance" icon={TrendingUp} label="Performance" />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            ADMINISTRATION
          </h3>
          <div className="mt-3 px-4">
            <NavItem to="/settings/integrations" icon={Sliders} label="Integrations" />
            <NavItem to="/settings/profile" icon={User} label="User Profile" />
          </div>
        </div>

        <div className="mt-6 px-4">
          <Button 
            variant="default" 
            className="w-full flex items-center justify-center gap-2"
            onClick={handleRefreshData}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </Button>
        </div>
      </nav>

      {/* User Profile */}
      <div className="border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-9 w-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
              AM
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">Alex Morgan</p>
            <p className="text-xs text-gray-400">alex@company.com</p>
          </div>
          <button className="ml-auto text-gray-400 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
