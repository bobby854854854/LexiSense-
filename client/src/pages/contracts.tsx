import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { getContracts } from "@/lib/api";
import type { Contract as UIContract } from "@/components/contract-table";
import { useLocation } from "wouter";

export default function Contracts() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const { data: contracts = [], isLoading, error } = useQuery({
    queryKey: ["/api/contracts"],
    queryFn: getContracts,
    retry: 1,
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Failed to load contracts</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // Ensure status values conform to the UI Contract['status'] union
  function normalizeStatus(s: unknown): UIContract["status"] {
    if (s === "active" || s === "expiring" || s === "expired" || s === "draft") {
      return s as UIContract["status"];
    }
    return "draft";
  }

  const filteredContracts = contracts
    .filter((contract) => {
    const matchesSearch =
      (contract.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (contract.counterparty?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  })
    .map((contract) => ({
        ...contract,
        // Add a UI-friendly `type` field while ensuring status matches the typed union
        type: contract.contractType || "N/A",
        status: normalizeStatus((contract as any).status),
      })) as UIContract[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contract Repository</h1>
          <p className="text-muted-foreground">
            Centralized storage and management of all contracts
          </p>
        </div>
        <Button onClick={() => setLocation("/upload")} data-testid="button-upload-contract">
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

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading contracts...</div>
      ) : filteredContracts.length === 0 && contracts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No contracts yet. Upload your first contract to get started!</p>
          <Button onClick={() => setLocation("/upload")} data-testid="button-upload-first">
            <Upload className="h-4 w-4 mr-2" />
            Upload First Contract
          </Button>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No contracts match your search criteria.
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
