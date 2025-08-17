"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { FineInsert, UserSelect } from "@/types/models";
import { CreditFormValues } from "@/types/common";

async function getUsers(): Promise<UserSelect[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, username, name')
    .order('username');

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data || [];
}

async function addCredit(fine: FineInsert) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('fines')
    .insert(fine);
  
    if (error) {
      console.error('Error pushing credit', error);
      return { data: null, error: error.message };
    }
  
    return {data, error}

  
  
}


export function validateCreditForm(values: CreditFormValues): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (values.recipientId.trim() === "") {
    errors.recipientId = "recipient is required.";
  }

  if (!values.description || values.description.trim() === "") {
    errors.description = "Description is required.";
  }

  if (values.amount <= 0) {
    errors.amount = "Amount must be greater than zero.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export default function AddCreditForm() {
  const [users, setUsers] = useState<UserSelect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);

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
        <h3 className="text-lg font-semibold">Add New Credit</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-[#3b2a22] font-medium mb-2">Recipient</label>
          <Select value={selectedUser || ""} onValueChange={(value: string) => setSelectedUser(value)}>            <SelectTrigger className="border-[#7d6c64] focus:border-[#6b4a41] focus:ring-[#6b4a41]">
            <SelectValue placeholder={loading ? "Loading users..." : "Select offender"} />            </SelectTrigger>
            <SelectContent>
            {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
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
          <label className="block text-[#3b2a22] font-medium mb-2">Description</label>
          <Input
            placeholder="Enter credit description"
            className="border-[#7d6c64] focus:border-[#6b4a41] focus:ring-[#6b4a41] placeholder:text-gray-400"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
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
        <div className="flex justify-end">
          <Button className="bg-[#7d6c64] hover:bg-[#6b4a41] text-white font-semibold px-6 py-2 shadow"
          onClick={() => {
            const validation = validateCreditForm({
              recipientId: selectedUser,
              description,
              amount
            });
            
            if (!validation.valid) {
              alert(Object.values(validation.errors).join('\n'));
              return;
            }
            addCredit({
              amount: amount,
              created_at: new Date().toISOString(),
              date: new Date().toISOString(),
              description: description,
              offender_id: selectedUser,
              proposed_by: "68accc08-996e-4f13-ae69-f521fa2387f6",
              replies: 0,
            });
          }} 
          >
          
            Add Credit
          </Button>
        </div>
      </div>
    </div>
  );
}
