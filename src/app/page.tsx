"use client"

import { Header } from "@/components/layout";
import { DataTable } from "@/components/shared";
import { AddFineForm, columns } from "@/components/features/fines";
import { ProtectedRoute } from "@/components/features/auth";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DataTableRow } from "@/types/common";
import type { FineWithUsersQuery } from "@/types/api";
import { useAuth } from "@/contexts/auth-context";

// Transform function moved from API file for client-side use
function transformFinesToDataTableRows(fines: FineWithUsersQuery[]): DataTableRow[] {
  return fines.map((fine) => ({
    id: fine.id,
    date: fine.date,
    fine_type: fine.fine_type,
    subject: Array.isArray(fine.subject) ? fine.subject[0]?.name || 'Unknown' : fine.subject?.name || 'Unknown',
    description: fine.description,
    amount: fine.amount,
    proposer: Array.isArray(fine.proposer) ? fine.proposer[0]?.name || 'Unknown' : fine.proposer?.name || 'Unknown',
    replies: fine.replies
  }));
}

export default function Home() {
  const [finesData, setFinesData] = useState<DataTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchFines = async () => {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('fines')
        .select(`
          id,
          date,
          fine_type,
          description,
          amount,
          replies,
          subject:users!fines_offender_id_fkey(name),
          proposer:users!fines_proposed_by_fkey(name)
        `)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching fines:', error);
        return;
      }

      const transformedData = transformFinesToDataTableRows(data || []);
      setFinesData(transformedData);
    } catch (error) {
      console.error('Failed to fetch fines:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFines();

    // Set up real-time subscription
    const supabase = createClient();
    const channel = supabase
      .channel('fines-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fines'
        },
        () => {
          // Refetch data when any change occurs
          fetchFines();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header username={user?.name || "User"} role={user?.role || "User"} />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="space-y-8">
            {/* Data Table Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <DataTable columns={columns} data={finesData} loading={loading} />
            </div>
            
            {/* Add Fine Form Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <AddFineForm onFineAdded={fetchFines} />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
