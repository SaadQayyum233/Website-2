import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { Eye, MousePointer, X, BarChart2, Calendar, FileText } from "lucide-react";

// Define interface for email and delivery data
interface EmailAnalytics {
  emailId: number;
  emailName: string;
  emailType: 'template' | 'priority' | 'experiment';
  stats: {
    total: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    deliveryRate: string;
    openRate: string;
    clickRate: string;
    clickThroughRate: string;
    bounceRate: string;
    complaintRate: string;
  };
}

const PerformancePage = () => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);

  // Fetch all emails
  const { data: emails = [], isLoading: isLoadingEmails } = useQuery({
    queryKey: ['/api/emails'],
  });

  // Filter emails based on active tab
  const filteredEmails = emails.filter((email: any) => {
    if (activeTab === 'all') return true;
    return email.type === activeTab;
  });

  // Fetch email analytics for selected email
  const { data: emailAnalytics, isLoading: isLoadingAnalytics } = useQuery<EmailAnalytics>({
    queryKey: ['/api/analytics/emails', selectedEmailId],
    enabled: !!selectedEmailId,
  });

  // Table columns definition
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const email = row.original;
        return (
          <div className="flex items-center gap-2">
            <span>{email.name}</span>
            {email.version > 1 && (
              <Badge variant="outline" className="ml-1">v{email.version}</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <Badge variant={
            type === 'template' ? 'outline' :
            type === 'priority' ? 'default' :
            'secondary'
          }>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "subject",
      header: "Subject",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const email = row.original;
        
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedEmailId(email.id)}
          >
            <BarChart2 className="h-4 w-4 mr-2" />
            View Stats
          </Button>
        );
      },
    },
  ];

  // Mock data for time-series chart (would be fetched from API in real implementation)
  const timeSeriesData = [
    { date: '2023-06-01', opens: 12, clicks: 5 },
    { date: '2023-06-02', opens: 15, clicks: 7 },
    { date: '2023-06-03', opens: 8, clicks: 3 },
    { date: '2023-06-04', opens: 22, clicks: 10 },
    { date: '2023-06-05', opens: 17, clicks: 8 },
    { date: '2023-06-06', opens: 25, clicks: 12 },
    { date: '2023-06-07', opens: 28, clicks: 14 },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Performance</h1>
        <p className="text-muted-foreground">
          Analyze detailed email performance metrics
        </p>
      </div>

      {/* Performance view with no tabs */}

      {/* Email list table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Email Performance</CardTitle>
          <CardDescription>
            Select an email to view detailed performance analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={filteredEmails} 
            filterPlaceholder="Search emails..." 
          />
        </CardContent>
      </Card>

      {/* Email Analytics Dialog */}
      <Dialog open={selectedEmailId !== null} onOpenChange={(open) => !open && setSelectedEmailId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Email Performance Analysis</span>
              <Button variant="ghost" size="icon" onClick={() => setSelectedEmailId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              {isLoadingAnalytics ? (
                "Loading email analytics..."
              ) : (
                <>
                  Detailed performance metrics for "{emailAnalytics?.emailName}"
                  <Badge className="ml-2" variant={
                    emailAnalytics?.emailType === 'template' ? 'outline' :
                    emailAnalytics?.emailType === 'priority' ? 'default' :
                    'secondary'
                  }>
                    {emailAnalytics?.emailType?.charAt(0).toUpperCase() + emailAnalytics?.emailType?.slice(1)}
                  </Badge>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoadingAnalytics ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : emailAnalytics ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="p-3 bg-blue-50 rounded-full mb-2">
                        <FileText className="w-6 h-6 text-blue-500" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
                      <p className="text-2xl font-semibold">{emailAnalytics.stats.total}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Delivery Rate: {emailAnalytics.stats.deliveryRate}%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="p-3 bg-green-50 rounded-full mb-2">
                        <Eye className="w-6 h-6 text-green-500" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">Opens</p>
                      <p className="text-2xl font-semibold">{emailAnalytics.stats.opened}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Open Rate: {emailAnalytics.stats.openRate}%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="p-3 bg-amber-50 rounded-full mb-2">
                        <MousePointer className="w-6 h-6 text-amber-500" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">Clicks</p>
                      <p className="text-2xl font-semibold">{emailAnalytics.stats.clicked}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click Rate: {emailAnalytics.stats.clickRate}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Charts */}
              <div className="space-y-6">
                {/* Funnel Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Email Funnel</CardTitle>
                    <CardDescription>
                      Visualization of the email performance funnel
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: 'Sent', value: emailAnalytics.stats.total },
                            { name: 'Delivered', value: emailAnalytics.stats.delivered },
                            { name: 'Opened', value: emailAnalytics.stats.opened },
                            { name: 'Clicked', value: emailAnalytics.stats.clicked },
                          ]}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" />
                          <Tooltip formatter={(value) => [value, 'Count']} />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Time Series Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Over Time</CardTitle>
                    <CardDescription>
                      Opens and clicks over time since sending
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={timeSeriesData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(date) => new Date(date).toLocaleDateString()} 
                            formatter={(value) => [value, '']}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="opens" stroke="#10b981" name="Opens" />
                          <Line type="monotone" dataKey="clicks" stroke="#f59e0b" name="Clicks" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Metrics Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Metrics</CardTitle>
                    <CardDescription>
                      Comprehensive email performance statistics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
                        <p className="text-lg font-semibold">{emailAnalytics.stats.total}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                        <p className="text-lg font-semibold">{emailAnalytics.stats.delivered}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Delivery Rate</p>
                        <p className="text-lg font-semibold">{emailAnalytics.stats.deliveryRate}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Opened</p>
                        <p className="text-lg font-semibold">{emailAnalytics.stats.opened}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Open Rate</p>
                        <p className="text-lg font-semibold">{emailAnalytics.stats.openRate}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Clicked</p>
                        <p className="text-lg font-semibold">{emailAnalytics.stats.clicked}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Click Rate</p>
                        <p className="text-lg font-semibold">{emailAnalytics.stats.clickRate}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Click-Through Rate</p>
                        <p className="text-lg font-semibold">{emailAnalytics.stats.clickThroughRate}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Bounced</p>
                        <p className="text-lg font-semibold">{emailAnalytics.stats.bounced}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Bounce Rate</p>
                        <p className="text-lg font-semibold">{emailAnalytics.stats.bounceRate}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Complained</p>
                        <p className="text-lg font-semibold">{emailAnalytics.stats.complained}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Complaint Rate</p>
                        <p className="text-lg font-semibold">{emailAnalytics.stats.complaintRate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No data available for this email</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PerformancePage;
