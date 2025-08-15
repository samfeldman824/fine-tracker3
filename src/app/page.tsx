import Header from "@/components/header";
import { DataTable } from "@/components/data-table";
import { columns, DataTableRow } from "@/components/fines-columns";


async function getData(): Promise<DataTableRow[]> {
  // Fetch data from your API here.
  return [
    {
      id: "1234",
      date: "07/21/2025",
      offender: "Jit Bag",
      description: "Complete Jitter behavior",
      amount: 10,
      proposedBy: "Less jit bag",
      replies: 0

    },
    {
      id: "1235",
      date: "07/22/2025",
      offender: "Jit Bag 2",
      description: "Complete Jitter behavior",
      amount: 2,
      proposedBy: "Jit Bag",
      replies: 1

    }
  ]
}


const data = await getData()

export default function Home() {
  return (
    <div className="font-sans min-h-screen">
     <Header username={"Jit Bag"} role="Admin" />
    <DataTable columns={columns} data={data} /> 
    </div>
  );
}
