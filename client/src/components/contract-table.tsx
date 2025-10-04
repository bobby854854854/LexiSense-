import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

interface Contract {
  id: string;
  title: string;
  counterparty: string;
  status: "active" | "expiring" | "expired" | "draft";
  value: string;
  effectiveDate: string;
  expiryDate: string;
  type: string;
}

interface ContractTableProps {
  contracts: Contract[];
  onRowClick?: (contract: Contract) => void;
}

const statusColors = {
  active: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  expiring: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  expired: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  draft: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
};

export function ContractTable({ contracts, onRowClick }: ContractTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 -ml-3"
                data-testid="button-sort-title"
              >
                Contract Title
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>Counterparty</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Effective Date</TableHead>
            <TableHead>Expiry Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => (
            <TableRow
              key={contract.id}
              className="cursor-pointer hover-elevate"
              onClick={() => onRowClick?.(contract)}
              data-testid={`row-contract-${contract.id}`}
            >
              <TableCell className="font-medium">{contract.title}</TableCell>
              <TableCell>{contract.counterparty}</TableCell>
              <TableCell className="text-muted-foreground">
                {contract.type}
              </TableCell>
              <TableCell>
                <Badge className={statusColors[contract.status]}>
                  {contract.status.charAt(0).toUpperCase() +
                    contract.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>{contract.value}</TableCell>
              <TableCell className="text-muted-foreground">
                {contract.effectiveDate}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {contract.expiryDate}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
