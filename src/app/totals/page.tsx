"use client"

import { Header } from "@/components/layout";
import { ProtectedRoute } from "@/components/features/auth";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FineWithUsersQuery } from "@/types/api";
import { useAuth } from "@/contexts/auth-context";

type UserFineTotal = {
  name: string;
  total: number;
};

type FineTotalQuery = {
  amount: number;
  subject: { name: string } | { name: string }[] | null;
};

export default function Totals() {
  const [userTotals, setUserTotals] = useState<UserFineTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [grandTotal, setGrandTotal] = useState(0);
  const { user } = useAuth();

  const fetchFineTotals = async () => {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('fines')
        .select(`
          amount,
          subject:users!fines_subject_id_fkey(name)
        `);

      if (error) {
        console.error('Error fetching fines:', error);
        return;
      }

      // Calculate totals per user
      const totalsMap = new Map<string, number>();
      
      (data as FineTotalQuery[])?.forEach((fine) => {
        let subjectName = 'Unknown';
        
        if (fine.subject) {
          if (Array.isArray(fine.subject)) {
            subjectName = fine.subject[0]?.name || 'Unknown';
          } else {
            subjectName = fine.subject.name || 'Unknown';
          }
        }
        
        const currentTotal = totalsMap.get(subjectName) || 0;
        totalsMap.set(subjectName, currentTotal + fine.amount);
      });

      // Convert to array and sort by name
      const totalsArray: UserFineTotal[] = Array.from(totalsMap.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setUserTotals(totalsArray);
      
      // Calculate grand total
      const total = Array.from(totalsMap.values()).reduce((sum, amount) => sum + amount, 0);
      setGrandTotal(total);
    } catch (error) {
      console.error('Failed to fetch fine totals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFineTotals();

    // Set up real-time subscription
    const supabase = createClient();
    const channel = supabase
      .channel('fines-totals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fines'
        },
        () => {
          // Refetch data when any change occurs
          fetchFineTotals();
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
            {/* Fine Totals Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Fine Totals</h1>
                <div className="w-24 h-0.5 bg-amber-600 mx-auto"></div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <>
                  {/* User Totals Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                    {userTotals.map((userTotal) => (
                      <div 
                        key={userTotal.name}
                        className="bg-gray-100 rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900 truncate">
                            {userTotal.name}
                          </span>
                          <div className="w-px h-6 bg-red-500 mx-2"></div>
                          <span className="font-bold text-red-600">
                            ${userTotal.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Grand Total */}
                  <div className="bg-blue-600 rounded-lg p-4 text-center">
                    <span className="text-white font-bold text-lg">
                      Total Fines: ${grandTotal.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}