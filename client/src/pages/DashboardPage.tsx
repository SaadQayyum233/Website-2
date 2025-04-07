import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Eye, MousePointer, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const DashboardPage = () => {
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['/api/analytics/summary'],
  });

  const { data: statisticsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/analytics/statistics'],
  });

  // Mock data for chart for now - would normally get from API
  const chartData = [
    { name: 'Mon', value: 34 },
    { name: 'Tue', value: 52 },
    { name: 'Wed', value: 67 },
    { name: 'Thu', value: 58 },
    { name: 'Fri', value: 78 },
    { name: 'Sat', value: 74 },
    { name: 'Sun', value: 85 },
  ];

  // Format timestamp for recent activity
  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} days ago`;
    
    const months = Math.floor(days / 30);
    return `${months} months ago`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your email automation performance</p>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Emails Sent Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Emails Sent</p>
                <p className="text-2xl font-semibold mt-1">
                  {isLoadingSummary ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    summaryData?.deliveryCounts?.totalSent || 0
                  )}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Mail className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-500 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                12.5%
              </span>
              <span className="text-muted-foreground ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Open Rate Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open Rate</p>
                <p className="text-2xl font-semibold mt-1">
                  {isLoadingSummary ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    `${summaryData?.rates?.openRate || 0}%`
                  )}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Eye className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-500 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                3.2%
              </span>
              <span className="text-muted-foreground ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Click Rate Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-semibold mt-1">
                  {isLoadingSummary ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    `${summaryData?.rates?.clickRate || 0}%`
                  )}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <MousePointer className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-red-500 flex items-center">
                <TrendingDown className="w-4 h-4 mr-1" />
                1.5%
              </span>
              <span className="text-muted-foreground ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Bounce Rate Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bounce Rate</p>
                <p className="text-2xl font-semibold mt-1">1.8%</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-500 flex items-center">
                <TrendingDown className="w-4 h-4 mr-1" />
                0.3%
              </span>
              <span className="text-muted-foreground ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle>Email Performance Trends</CardTitle>
              <Select defaultValue="7days">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" barSize={40} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingSummary ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex items-start">
                    <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse mr-3 flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
                      <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2" />
                      <div className="h-3 bg-gray-200 animate-pulse rounded w-1/4" />
                    </div>
                  </div>
                ))
              ) : (
                summaryData?.recentActivity?.slice(0, 4).map((activity: any, index: number) => (
                  <div key={index} className="flex items-start">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 
                      ${activity.type === 'priority' ? 'bg-blue-100 text-blue-600' : 
                        activity.type === 'experiment' ? 'bg-green-100 text-green-600' :
                        'bg-amber-100 text-amber-600'}`}>
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {activity.type === 'priority' ? 'Priority Email Sent' :
                         activity.type === 'experiment' ? 'Experiment Email Sent' :
                         'Template Email Sent'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.name} to {activity.contactName}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.timestamp ? formatTimeAgo(activity.timestamp) : 'Recently'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button variant="link" className="mt-4 p-0">
              View all activity
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Email Type Performance Comparison */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Email Type Performance</CardTitle>
              <Button variant="outline" size="sm">
                Export Data
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email Type</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Clicked</TableHead>
                    <TableHead>Open Rate</TableHead>
                    <TableHead>Click Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingStats ? (
                    Array(3).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        {Array(6).fill(0).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-gray-200 animate-pulse rounded w-12" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    statisticsData?.map((stat: any) => (
                      <TableRow key={stat.type}>
                        <TableCell className="font-medium">
                          {stat.type.charAt(0).toUpperCase() + stat.type.slice(1)} Emails
                        </TableCell>
                        <TableCell>{stat.stats.sent}</TableCell>
                        <TableCell>{stat.stats.opened}</TableCell>
                        <TableCell>{stat.stats.clicked}</TableCell>
                        <TableCell>
                          <span className="text-green-600">{stat.stats.openRate}%</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-green-600">{stat.stats.clickRate}%</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
