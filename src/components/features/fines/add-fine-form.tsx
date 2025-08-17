"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { UserSelect, FineInsert } from "@/types/models";
import { FineFormValues, FineType } from "@/types/common";
import { FineTypeToggle } from "./fine-type-toggle";

async function getUsers(): Promise<UserSelect[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('users')
    .select('user_id, username, name')
    .order('username');

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data || [];
}

async function addFine(fine: FineInsert) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('fines')
    .insert(fine);
  
    if (error) {
      console.error('Error pushing fine', error);
      return { data: null, error: error.message };
    }
  
    return {data, error}

}

export function validateFineForm(values: FineFormValues, fineType: FineType): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!values.subject_id || values.subject_id.trim() === "") {
    errors.subject_id = "Subject is required.";
  }

  if (!values.description || values.description.trim() === "") {
    errors.description = "Description is required.";
  }

  // Only validate amount for non-warning types
  if (fineType !== "Warning" && values.amount <= 0) {
    errors.amount = "Amount must be greater than zero.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}




export function AddFineForm({ onFineAdded }: { onFineAdded?: () => void }) {
  const [users, setUsers] = useState<UserSelect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [fineType, setFineType] = useState<FineType>("Fine");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const userData = await getUsers();
        setUsers(userData);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  return (
    <div className="space-y-4">
      {/* Form Header */}
      <div className="bg-[#7d6c64] text-white px-4 py-3 rounded-md">
        <h3 className="text-lg font-semibold">Add New Fine</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[#3b2a22] font-medium mb-2">Player</label>
          <Select value={selectedUser || ""} onValueChange={(value: string) => setSelectedUser(value)}>
            <SelectTrigger className="border-[#7d6c64] focus:border-[#6b4a41] focus:ring-[#6b4a41]">
              <SelectValue placeholder={loading ? "Loading users..." : "Select player"} />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.user_id} value={user.user_id}>
                  {user.name || user.username}
                </SelectItem>
              ))}
              {users.length === 0 && !loading && (
                <SelectItem value="" disabled>
                  No users found
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Fine Type</label>
          <FineTypeToggle value={fineType} onChange={setFineType} />
    </div>
        </div>
        <div>
          <label className="block text-[#3b2a22] font-medium mb-2">Description</label>
          <Input
            placeholder="Enter description"
            className="border-[#7d6c64] focus:border-[#6b4a41] focus:ring-[#6b4a41] placeholder:text-gray-400"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {fineType !== "Warning" && (
          <div>
            <label className="block text-[#3b2a22] font-medium mb-2">Amount ($)</label>
            <Input
              type="number"
              placeholder="Enter amount"
              className="border-[#7d6c64] focus:border-[#6b4a41] focus:ring-[#6b4a41] placeholder:text-gray-400"
              value={amount.toString()}
              onChange={(e) => setAmount(Number(e.target.value.toString()))}
            />
          </div>
        )}
        <div className="flex justify-end">
          <Button
            className="bg-[#7d6c64] hover:bg-[#6b4a41] text-white font-semibold px-6 py-2 shadow"
            disabled={submitting}
            onClick={async () => {
              const validation = validateFineForm({
                subject_id: selectedUser,
                description,
                amount
              }, fineType);
              
              if (!validation.valid) {
                alert(Object.values(validation.errors).join('\n'));
                return;
              }

              setSubmitting(true);
              try {
                const result = await addFine({
                  amount: fineType === "Warning" ? 0 : amount,
                  date: new Date().toISOString(),
                  fine_type: fineType,
                  description: description,
                  subject_id: selectedUser,
                  proposer_id: "3c47135b-be02-4ae7-9345-d704090ccdff",
                  replies: 0,
                });

                if (result.error) {
                  alert('Error adding fine: ' + result.error);
                } else {
                  // Clear form
                  setSelectedUser("");
                  setDescription("");
                  setAmount(0);
                  
                  // Call callback to refresh table
                  onFineAdded?.();
                }
              } catch (error) {
                alert('Error adding fine: ' + error);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Adding..." : `Add ${fineType}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
