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
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  FlaskRound, 
  BarChart2, 
  Award, 
  TrendingUp, 
  Zap, 
  X,
  ArrowUpRight 
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";

// Define interface for experiment data
interface ExperimentData {
  experimentId: number;
  experimentName: string;
  variants: VariantData[];
  winner: {
    variantId: number;
    variantLetter: string;
    openRate: string;
    improvement: string;
  } | null;
}

interface VariantData {
  variantId: number;
  variantLetter: string;
  subject: string;
  stats: {
    total: number;
    delivered: number;
    opened: number;
    clicked: number;
    deliveryRate: string;
    openRate: string;
    clickRate: string;
    clickThroughRate: string;
  };
}

const ExperimentsPage = () => {
  const [selectedExperimentId, setSelectedExperimentId] = useState<number | null>(null);

  // Fetch all experiment emails
  const { data: emails = [], isLoading: isLoadingEmails } = useQuery({
    queryKey: ['/api/emails'],
    select: (data: any[]) => data.filter(email => email.type === 'experiment')
  });

  // Fetch experiment data for selected experiment
  const { data: experimentData, isLoading: isLoadingExperiment } = useQuery<ExperimentData>({
    queryKey: ['/api/analytics/experiments', selectedExperimentId],
    enabled: !!selectedExperimentId,
  });

  // Table columns definition
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Experiment Name",
    },
    {
      accessorKey: "subject",
      header: "Base Subject",
    },
    {
      accessorKey: "key_angle",
      header: "Key Angle",
      cell: ({ row }) => {
        const keyAngle = row.getValue("key_angle") as string;
        return keyAngle || <span className="text-muted-foreground text-sm">Not specified</span>;
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const created = row.getValue("created_at") as string;
        return <span>{new Date(created).toLocaleDateString()}</span>;
      },
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
            onClick={() => setSelectedExperimentId(email.id)}
          >
            <BarChart2 className="h-4 w-4 mr-2" />
            View Results
          </Button>
        );
      },
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Email Experiments</h1>
        <p className="text-muted-foreground">
          Compare and analyze your A/B test results
        </p>
      </div>

      {/* Experiments list */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Email Experiments</CardTitle>
          <CardDescription>
            Select an experiment to view detailed results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingEmails ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12">
              <FlaskRound className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No experiments found</h3>
              <p className="text-muted-foreground mb-4">
                Create an experiment email to start testing different subject lines and content.
              </p>
              <Button onClick={() => window.location.href = "/emails"}>
                Create Experiment
              </Button>
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={emails} 
              filterPlaceholder="Search experiments..." 
            />
          )}
        </CardContent>
      </Card>

      {/* Experiment Results Dialog */}
      <Dialog open={selectedExperimentId !== null} onOpenChange={(open) => !open && setSelectedExperimentId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Experiment Results</span>
              <Button variant="ghost" size="icon" onClick={() => setSelectedExperimentId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              {isLoadingExperiment ? (
                "Loading experiment results..."
              ) : (
                `Comparing variants for "${experimentData?.experimentName}"`
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoadingExperiment ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : experimentData?.variants && experimentData.variants.length > 0 ? (
            <>
              {/* Winner Card */}
              {experimentData.winner && (
                <Card className="mb-6 bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 text-green-700 rounded-full">
                        <Award className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold flex items-center text-green-800">
                          Variant {experimentData.winner.variantLetter} is the winner!
                        </h3>
                        <p className="text-green-700">
                          {experimentData.winner.openRate}% open rate • {experimentData.winner.improvement} improvement
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Variants Comparison */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Open Rate Comparison</CardTitle>
                  <CardDescription>
                    Comparing open rates across all variants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={experimentData.variants.map(v => ({
                          variant: `Variant ${v.variantLetter}`,
                          openRate: parseFloat(v.stats.openRate),
                          isWinner: experimentData.winner?.variantId === v.variantId
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="variant" />
                        <YAxis unit="%" />
                        <Tooltip formatter={(value) => [`${value}%`, 'Open Rate']} />
                        <Bar dataKey="openRate" fill="hsl(var(--primary))">
                          {experimentData.variants.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={experimentData.winner?.variantId === entry.variantId 
                                ? '#10b981' : 'hsl(var(--primary))'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Variant Details Cards */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Variant Details</h3>
                <div className="grid grid-cols-1 gap-4">
                  {experimentData.variants.map((variant) => (
                    <Card 
                      key={variant.variantId}
                      className={experimentData.winner?.variantId === variant.variantId 
                        ? "border-green-300 shadow-md" : ""}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="flex items-center gap-2">
                            <FlaskRound className="h-5 w-5" />
                            Variant {variant.variantLetter}
                            {experimentData.winner?.variantId === variant.variantId && (
                              <Badge className="ml-2 bg-green-500">Winner</Badge>
                            )}
                          </CardTitle>
                          <Badge variant="outline">
                            {variant.stats.openRate}% open rate
                          </Badge>
                        </div>
                        <CardDescription>
                          Subject: {variant.subject}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Sent</p>
                            <p className="text-lg font-semibold">{variant.stats.total}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                            <p className="text-lg font-semibold">{variant.stats.delivered}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Opened</p>
                            <p className="text-lg font-semibold">{variant.stats.opened}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Clicked</p>
                            <p className="text-lg font-semibold">{variant.stats.clicked}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Open Rate</span>
                              <span>{variant.stats.openRate}%</span>
                            </div>
                            <Progress value={parseFloat(variant.stats.openRate)} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Click Rate</span>
                              <span>{variant.stats.clickRate}%</span>
                            </div>
                            <Progress value={parseFloat(variant.stats.clickRate)} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Click-Through Rate</span>
                              <span>{variant.stats.clickThroughRate}%</span>
                            </div>
                            <Progress value={parseFloat(variant.stats.clickThroughRate)} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedExperimentId(null)}>
                  Close
                </Button>
                <Button 
                  variant="default" 
                  onClick={() => window.location.href = "/emails"} 
                  className="gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Create New Experiment
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No variant data available for this experiment</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = `/emails`}
              >
                Go to Emails
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExperimentsPage;
