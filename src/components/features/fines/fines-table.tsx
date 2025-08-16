"use client";

import { DataTable } from "@/components/shared";
import { columns } from "./fines-columns";
import type { DataTableRow } from "@/types/common";
import { Fine } from "@/types/models";

interface FinesTableProps {
  data: Fine[];
  isLoading?: boolean;
  onRowClick?: (fine: Fine) => void;
}

export function FinesTable({ data, isLoading, onRowClick }: FinesTableProps) {
  // Transform Fine data to DataTableRow format
  const tableData: DataTableRow[] = data.map((fine) => ({
    id: fine.id,
    date: fine.date,
    offender: "Unknown", // This would come from the joined user data
    description: fine.description,
    amount: fine.amount,
    proposedBy: "Unknown", // This would come from the joined user data
    replies: fine.replies,
  }));

  return (
    <DataTable 
      columns={columns} 
      data={tableData}
    />
  );
}
