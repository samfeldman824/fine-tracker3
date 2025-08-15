import { AddFineForm } from "./add-fine-form";
import { AddCreditForm } from "./add-credit-form";

export function FormsContainer() {
  return (
    <div className="w-full bg-white shadow-md rounded-lg overflow-hidden border border-[#7d6c64]">
      {/* Header */}
      <div className="bg-[#3b2a22] text-white px-6 py-4">
        {/* <h2 className="text-xl font-bold">Transaction Management</h2> */}
      </div>
      
      {/* Forms Container */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="border-r border-[#7d6c64] pr-6">
            <AddFineForm />
          </div>
          <div className="pl-6">
            <AddCreditForm />
          </div>
        </div>
      </div>
    </div>
  );
}