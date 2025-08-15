import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export function AddCreditForm() {
  return (
    <div className="space-y-4">
      {/* Form Header */}
      <div className="bg-[#7d6c64] text-white px-4 py-3 rounded-md">
        <h3 className="text-lg font-semibold">Add New Credit</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-[#3b2a22] font-medium mb-2">Recipient</label>
          <Select>
            <SelectTrigger className="border-[#7d6c64] focus:border-[#6b4a41] focus:ring-[#6b4a41]">
              <SelectValue placeholder="Select recipient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user1">User 1</SelectItem>
              <SelectItem value="user2">User 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-[#3b2a22] font-medium mb-2">Description</label>
          <Input
            placeholder="Enter credit description"
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
            Add Credit
          </Button>
        </div>
      </div>
    </div>
  );
}
