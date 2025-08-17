import { Header } from "@/components/layout";
import { DataTable } from "@/components/shared";
import { AddFineForm, columns } from "@/components/features/fines";
import { getFinesForDataTable } from "@/lib/api";

export const dynamic = "force-dynamic"; // ✅ ADD THIS

export default async function Home() {

  // Getting all fines from Fine Table
  const FinesData = await getFinesForDataTable()

  return (
    <div className="font-sans min-h-screen">
      <Header username={"Jit Bag"} role="Admin" />
      <DataTable columns={columns} data={FinesData} />
      <AddFineForm/>
    </div>
  );
}
