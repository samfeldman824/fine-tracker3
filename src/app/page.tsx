import { Header } from "@/components/layout";
import { DataTable } from "@/components/shared";
import { AddFineForm, columns } from "@/components/features/fines";
import { getFinesForDataTable } from "@/lib/api";

export const dynamic = "force-dynamic"; // ✅ ADD THIS

export default async function Home() {

  // Getting all fines from Fine Table
  const FinesData = await getFinesForDataTable()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header username={"Jit Bag"} role="Admin" />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Data Table Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <DataTable columns={columns} data={FinesData} />
          </div>
          
          {/* Add Fine Form Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <AddFineForm/>
          </div>
        </div>
      </main>
    </div>
  );
}
