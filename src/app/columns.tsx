"use client"

import { Button } from "@/components/ui/button"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"


// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type DataTableRow = {
  id: string
  date: string | Date // Date field - can be string or Date object
  offender: string
  description: string
  amount: number
  proposedBy: string
  replies: number | string // Replies field - could be count or string
}

export const columns: ColumnDef<DataTableRow>[] = [
  {
    accessorKey: "date",
    header: "Date",
  },
  {
    accessorKey: "offender",
    header: "Offender",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
 
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "proposedBy",
    header: "Proposed By",
  },
  {
    accessorKey: "replies",
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-white hover:bg-[#6b4a41] hover:text-white -ml-4"
          >
            Replies
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
  }
]
