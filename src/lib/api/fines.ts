import { createClient } from "@/lib/supabase/server";
import type { FineWithUsersQuery, GetFinesResult } from "@/types/api";
import type { DataTableRow } from "@/types/common";

/**
 * Fetches all fines from the database with related user information
 * @returns Promise<GetFinesResult> - Object containing data and error information
 */
export async function getFines(): Promise<GetFinesResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('fines')
      .select(`
        id,
        date,
        fine_type,
        description,
        amount,
        replies,
        subject:users!fines_subject_id_fkey(name),
        proposer:users!fines_proposer_id_fkey(name)
      `);

    if (error) {
      console.error('Error fetching fines:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Transforms fines data from database format to DataTableRow format
 * @param fines - Array of fines from database
 * @returns DataTableRow[] - Transformed data for the data table
 */
export function transformFinesToDataTableRows(fines: FineWithUsersQuery[]): DataTableRow[] {
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

/**
 * Fetches fines and transforms them to DataTableRow format
 * @returns Promise<DataTableRow[]> - Transformed fines data for the data table
 */
export async function getFinesForDataTable(): Promise<DataTableRow[]> {
  const result = await getFines();
  
  if (result.error) {
    console.error('Error fetching fines:', result.error);
    return [];
  }
  
  return transformFinesToDataTableRows(result.data || []);
}
