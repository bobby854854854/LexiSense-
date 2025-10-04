import { useState } from "react";
import { StatCard } from "@/components/stat-card";
import { ContractCard } from "@/components/contract-card";
import { ActivityFeed } from "@/components/activity-feed";
import { RiskIndicator } from "@/components/risk-indicator";
import {
  FileText,
  Clock,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Dashboard() {
  const [selectedContract, setSelectedContract] = useState<string | null>(null);

  const stats = [
    {
      title: "Active Contracts",
      value: "1,247",
      icon: FileText,
      trend: "+12% from last month",
      trendDirection: "up" as const,
      testId: "card-stat-active",
    },
    {
      title: "Expiring Soon",
      value: "23",
      icon: Clock,
      trend: "Next 30 days",
      trendDirection: "down" as const,
      testId: "card-stat-expiring",
    },
    {
      title: "AI Assists This Month",
      value: "342",
      icon: Sparkles,
      trend: "+28% from last month",
      trendDirection: "up" as const,
      testId: "card-stat-ai",
    },
    {
      title: "Cost Savings",
      value: "$1.2M",
      icon: TrendingUp,
      trend: "+18% from last month",
      trendDirection: "up" as const,
      testId: "card-stat-savings",
    },
  ];

  const recentContracts = [
    {
      id: "1",
      title: "Master Service Agreement",
      counterparty: "Acme Corporation",
      status: "active" as const,
      value: "$250,000",
      expiryDate: "Dec 31, 2025",
      riskLevel: "low" as const,
    },
    {
      id: "2",
      title: "Software License Agreement",
      counterparty: "TechCo Inc",
      status: "expiring" as const,
      value: "$150,000",
      expiryDate: "Mar 15, 2025",
      riskLevel: "medium" as const,
    },
    {
      id: "3",
      title: "Consulting Services Agreement",
      counterparty: "Global Consulting LLC",
      status: "active" as const,
      value: "$500,000",
      expiryDate: "Jun 30, 2026",
      riskLevel: "high" as const,
    },
  ];

  const activities = [
    {
      id: "1",
      type: "contract_uploaded" as const,
      title: "New Contract Uploaded",
      description: "Master Service Agreement with Acme Corp",
      timestamp: "2 minutes ago",
    },
    {
      id: "2",
      type: "analysis_complete" as const,
      title: "AI Analysis Complete",
      description: "Contract analyzed - 3 key terms extracted",
      timestamp: "15 minutes ago",
    },
    {
      id: "3",
      type: "risk_detected" as const,
      title: "Risk Alert",
      description: "Non-standard liability clause detected in TechCo contract",
      timestamp: "1 hour ago",
    },
    {
      id: "4",
      type: "expiring_soon" as const,
      title: "Contract Expiring",
      description: "Software License Agreement expires in 45 days",
      timestamp: "3 hours ago",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your contract portfolio overview.
          </p>
        </div>
        <Button data-testid="button-new-contract">
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.testId} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Contracts</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {recentContracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  {...contract}
                  onClick={() => {
                    console.log("Contract clicked:", contract.id);
                    setSelectedContract(contract.id);
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Risk Overview</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <RiskIndicator
                level="high"
                title="High Risk"
                description="Require immediate attention"
                count={12}
                testId="card-risk-high"
              />
              <RiskIndicator
                level="medium"
                title="Medium Risk"
                description="Review recommended"
                count={34}
                testId="card-risk-medium"
              />
              <RiskIndicator
                level="low"
                title="Low Risk"
                description="Standard compliance"
                count={1201}
                testId="card-risk-low"
              />
            </div>
          </div>
        </div>

        <div>
          <ActivityFeed activities={activities} testId="feed-activity" />
        </div>
      </div>
    </div>
  );
}
