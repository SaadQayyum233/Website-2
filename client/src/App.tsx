import { Route, Switch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import ContactsPage from "@/pages/ContactsPage";
import EmailsPage from "@/pages/EmailsPage";
import StatisticsPage from "@/pages/analytics/StatisticsPage";
import PerformancePage from "@/pages/analytics/PerformancePage";
import ExperimentsPage from "@/pages/analytics/ExperimentsPage";
import IntegrationsSettingsPage from "@/pages/settings/IntegrationsSettingsPage";
import ProfileSettingsPage from "@/pages/settings/ProfileSettingsPage";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/contacts" component={ContactsPage} />
        <Route path="/emails" component={EmailsPage} />
        <Route path="/analytics/statistics" component={StatisticsPage} />
        <Route path="/analytics/performance" component={PerformancePage} />
        <Route path="/analytics/experiments" component={ExperimentsPage} />
        <Route path="/settings/integrations" component={IntegrationsSettingsPage} />
        <Route path="/settings/profile" component={ProfileSettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
