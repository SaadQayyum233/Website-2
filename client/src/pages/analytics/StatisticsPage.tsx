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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Mail, Eye, MousePointer, AlertTriangle, FileText, Zap, FlaskRound } from "lucide-react";

const StatisticsPage = () => {
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['/api/analytics/summary'],
  });

  const { data: statisticsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/analytics/statistics'],
  });

  // Prepare data for pie chart - email type distribution
  const emailTypeData = React.useMemo(() => {
    if (!summaryData?.emailCounts) return [];
    
    return [
      { name: 'Templates', value: summaryData.emailCounts.template || 0, color: '#94a3b8' },
      { name: 'Priority', value: summaryData.emailCounts.priority || 0, color: '#3b82f6' },
      { name: 'Experiments', value: summaryData.emailCounts.experiment || 0, color: '#14b8a6' },
    ];
  }, [summaryData]);

  // Prepare data for bar chart - email performance by type
  const emailPerformanceData = React.useMemo(() => {
    if (!statisticsData) return [];
    
    return statisticsData.map((stat: any) => ({
      name: stat.type.charAt(0).toUpperCase() + stat.type.slice(1),
      openRate: parseFloat(stat.stats.openRate),
      clickRate: parseFloat(stat.stats.clickRate),
    }));
  }, [statisticsData]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Statistics</h1>
        <p className="text-muted-foreground">
          Analyze your email marketing performance
        </p>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Emails Sent Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Emails</p>
                <p className="text-2xl font-semibold mt-1">
                  {isLoadingSummary ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    summaryData?.emailCounts?.total || 0
                  )}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Mail className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs">
                <div className="flex items-center gap-1 mb-1">
                  <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                  <span>Templates: {summaryData?.emailCounts?.template || 0}</span>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span>Priority: {summaryData?.emailCounts?.priority || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-teal-500"></div>
                  <span>Experiments: {summaryData?.emailCounts?.experiment || 0}</span>
                </div>
              </div>
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
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Total Delivered: {summaryData?.deliveryCounts?.delivered || 0}</p>
              <p>Total Opened: {summaryData?.deliveryCounts?.opened || 0}</p>
              <p className="mt-1 text-sm font-medium">
                Industry Average: 21.33%
              </p>
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
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Total Clicked: {summaryData?.deliveryCounts?.clicked || 0}</p>
              <p>CTR: {summaryData?.rates?.clickThroughRate || 0}%</p>
              <p className="mt-1 text-sm font-medium">
                Industry Average: 2.62%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contacts Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                <p className="text-2xl font-semibold mt-1">
                  {isLoadingSummary ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    summaryData?.contacts?.total || 0
                  )}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Mail className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Emails per Contact (avg): {summaryData?.contacts?.total && summaryData?.deliveryCounts?.totalSent 
                ? (summaryData.deliveryCounts.totalSent / summaryData.contacts.total).toFixed(2)
                : "0"
              }</p>
              <p className="mt-1 text-sm font-medium">
                Increase audience by 20% this month
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Email Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Email Type Distribution</CardTitle>
            <CardDescription>
              Breakdown of your email types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={emailTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {emailTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} emails`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Email Performance by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Email Performance by Type</CardTitle>
            <CardDescription>
              Comparing open and click rates across email types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={emailPerformanceData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis unit="%" />
                  <Tooltip formatter={(value) => [`${value}%`, '']} />
                  <Legend />
                  <Bar dataKey="openRate" name="Open Rate" fill="#10b981" />
                  <Bar dataKey="clickRate" name="Click Rate" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Email Type Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Email Type Performance Details</CardTitle>
          <CardDescription>
            Detailed breakdown of performance metrics by email type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Count</TableHead>
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
                      {Array(7).fill(0).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 animate-pulse rounded w-12" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  statisticsData?.map((stat: any) => (
                    <TableRow key={stat.type}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {stat.type === 'template' ? <FileText className="h-4 w-4 text-slate-500" /> :
                         stat.type === 'priority' ? <Zap className="h-4 w-4 text-blue-500" /> :
                         <FlaskRound className="h-4 w-4 text-teal-500" />}
                        {stat.type.charAt(0).toUpperCase() + stat.type.slice(1)}
                      </TableCell>
                      <TableCell>{stat.emailCount}</TableCell>
                      <TableCell>{stat.stats.sent}</TableCell>
                      <TableCell>{stat.stats.opened}</TableCell>
                      <TableCell>{stat.stats.clicked}</TableCell>
                      <TableCell className="text-green-600">
                        {stat.stats.openRate}%
                      </TableCell>
                      <TableCell className="text-amber-600">
                        {stat.stats.clickRate}%
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
  );
};

export default StatisticsPage;
