import { Header } from "@/components/layout";
import { DataTable } from "@/components/shared";
import { columns } from "@/components/features/fines";
import type { DataTableRow } from "@/types/common";
import { FormsContainer } from "@/components/shared";
import { createClient } from "@/lib/supabase/server";
import { FineWithUsersQuery } from "@/types/api";

export const dynamic = "force-dynamic"; // ✅ ADD THIS


async function getFines(): Promise<DataTableRow[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('fines')
      .select(`
        id,
        date,
        description,
        amount,
        replies,
        offender:users!fines_offender_id_fkey(name),
        proposer:users!fines_proposed_by_fkey(name)
      `);

    if (error) {
      console.error('Error fetching fines:', error);
      return [];
    }

    return (data ?? []).map((fine: FineWithUsersQuery) => ({
      id: fine.id,
      date: fine.date,
      offender: Array.isArray(fine.offender) ? fine.offender[0]?.name || 'Unknown' : fine.offender?.name || 'Unknown',
      description: fine.description,
      amount: fine.amount,
      proposedBy: Array.isArray(fine.proposer) ? fine.proposer[0]?.name || 'Unknown' : fine.proposer?.name || 'Unknown',
      replies: fine.replies
    }));
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return [];
  }
}
export default async function Home() {

  // Getting all fines from Fine Table
  const FinesData = await getFines()

  return (
    <div className="font-sans min-h-screen">
      <Header username={"Jit Bag"} role="Admin" />
      <DataTable columns={columns} data={FinesData} />
      <FormsContainer />
    </div>
  );
}
