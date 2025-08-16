"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type User = {
  id: string;
  username: string;
  name: string | null;
};

async function getUsers(): Promise<User[]> {
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

export function AddFineForm() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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
          <label className="block text-[#3b2a22] font-medium mb-2">Offender</label>
          <Select>
            <SelectTrigger className="border-[#7d6c64] focus:border-[#6b4a41] focus:ring-[#6b4a41]">
              <SelectValue placeholder={loading ? "Loading users..." : "Select offender"} />
            </SelectTrigger>
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
            placeholder="Enter violation description"
            className="border-[#7d6c64] focus:border-[#6b4a41] focus:ring-[#6b4a41] placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="block text-[#3b2a22] font-medium mb-2">Amount ($)</label>
          <Input
            type="number"
            defaultValue="0"
            className="border-[#7d6c64] focus:border-[#6b4a41] focus:ring-[#6b4a41] placeholder:text-gray-400"
          />
        </div>
        <div className="flex justify-end">
          <Button className="bg-[#7d6c64] hover:bg-[#6b4a41] text-white font-semibold px-6 py-2 shadow">
            Add Fine
          </Button>
        </div>
      </div>
    </div>
  );
}
