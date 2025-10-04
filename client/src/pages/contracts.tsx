import { useState } from "react";
import { ContractTable } from "@/components/contract-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Upload, Filter } from "lucide-react";

export default function Contracts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const contracts = [
    {
      id: "1",
      title: "Master Service Agreement",
      counterparty: "Acme Corporation",
      type: "MSA",
      status: "active" as const,
      value: "$250,000",
      effectiveDate: "Jan 1, 2024",
      expiryDate: "Dec 31, 2025",
    },
    {
      id: "2",
      title: "Software License Agreement",
      counterparty: "TechCo Inc",
      type: "SLA",
      status: "expiring" as const,
      value: "$150,000",
      effectiveDate: "Mar 15, 2023",
      expiryDate: "Mar 15, 2025",
    },
    {
      id: "3",
      title: "Consulting Services Agreement",
      counterparty: "Global Consulting LLC",
      type: "CSA",
      status: "active" as const,
      value: "$500,000",
      effectiveDate: "Jun 1, 2024",
      expiryDate: "Jun 30, 2026",
    },
    {
      id: "4",
      title: "Non-Disclosure Agreement",
      counterparty: "Startup Ventures",
      type: "NDA",
      status: "active" as const,
      value: "$0",
      effectiveDate: "Feb 1, 2024",
      expiryDate: "Feb 1, 2027",
    },
    {
      id: "5",
      title: "Purchase Agreement",
      counterparty: "Supply Chain Co",
      type: "PA",
      status: "expired" as const,
      value: "$75,000",
      effectiveDate: "Jan 1, 2023",
      expiryDate: "Dec 31, 2024",
    },
  ];

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.counterparty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contract Repository</h1>
          <p className="text-muted-foreground">
            Centralized storage and management of all contracts
          </p>
        </div>
        <Button data-testid="button-upload-contract">
          <Upload className="h-4 w-4 mr-2" />
          Upload Contract
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contracts..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-status">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expiring">Expiring</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ContractTable
        contracts={filteredContracts}
        onRowClick={(contract) => console.log("Navigate to contract:", contract.id)}
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {filteredContracts.length} of {contracts.length} contracts
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled data-testid="button-prev">
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled data-testid="button-next">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
