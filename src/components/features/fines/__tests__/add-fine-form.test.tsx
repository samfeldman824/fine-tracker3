import { render, screen, waitFor } from "@testing-library/react";
import { AddFineForm, validateFineForm } from "../add-fine-form";
import userEvent from "@testing-library/user-event";

// Mock Supabase client
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: jest.fn().mockImplementation((table) => {
      if (table === "users") {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [
              { user_id: "1", name: "Alice", username: "alice" },
              { user_id: "2", name: "Bob", username: "bob" },
            ],
            error: null,
          }),
        };
      } else if (table === "fines") {
        return {
          insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
        };
      }
    }),
  }),
}));



 describe("AddFineForm", () => {
   beforeEach(() => {
     jest.clearAllMocks();
   });

   it("renders form elements correctly", async () => {
     render(<AddFineForm />);
 
     // Wait for users to load
     await waitFor(() => {
       expect(screen.getByText("Add New Fine")).toBeInTheDocument();
     });
 
     // Check that all form elements are present
     expect(screen.getByText("Player")).toBeInTheDocument();
     expect(screen.getByText("Fine Type")).toBeInTheDocument();
     expect(screen.getByText("Description")).toBeInTheDocument();
     expect(screen.getByText("Amount ($)")).toBeInTheDocument();
     expect(screen.getByPlaceholderText("Enter description")).toBeInTheDocument();
     expect(screen.getByPlaceholderText("Enter amount")).toBeInTheDocument();
     expect(screen.getByRole("button", { name: /Add Fine/i })).toBeInTheDocument();
   });

   it("fills form and submits data", async () => {
     render(<AddFineForm />);
 
     const user = userEvent.setup();
 
     // Wait for form to load
     await waitFor(() => {
       expect(screen.getByText("Add New Fine")).toBeInTheDocument();
     });
 
     // Fill out the form
     const descriptionInput = screen.getByPlaceholderText("Enter description");
     await user.type(descriptionInput, "Late to practice");
 
     const amountInput = screen.getByPlaceholderText("Enter amount");
     await user.type(amountInput, "10");
 
     // Submit the form
     const submitButton = screen.getByRole("button", { name: /Add Fine/i });
     await user.click(submitButton);
 
     // Check that validation error is shown (since no user is selected)
     await waitFor(() => {
       expect(window.alert).toHaveBeenCalled();
     });
   });

   it("shows validation errors for empty form submission", async () => {
     const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
     
     render(<AddFineForm />);
 
     const user = userEvent.setup();
 
     // Wait for form to load
     await waitFor(() => {
       expect(screen.getByText("Add New Fine")).toBeInTheDocument();
     });
 
     // Try to submit without filling anything
     const submitButton = screen.getByRole("button", { name: /Add Fine/i });
     await user.click(submitButton);
 
     // Check that validation error was shown
     expect(mockAlert).toHaveBeenCalled();
     
     mockAlert.mockRestore();
   });

   it("changes fine type and updates button text", async () => {
     render(<AddFineForm />);
 
     const user = userEvent.setup();
 
     // Wait for form to load
     await waitFor(() => {
       expect(screen.getByText("Add New Fine")).toBeInTheDocument();
     });
 
     // Check default is Fine
     expect(screen.getByText("Add Fine")).toBeInTheDocument();
 
     // Change to Credit by clicking the Credit toggle
     const creditToggle = screen.getByRole("radio", { name: "Credit" });
     await user.click(creditToggle);
     expect(screen.getByText("Add Credit")).toBeInTheDocument();
 
     // Change to Warning by clicking the Warning toggle
     const warningToggle = screen.getByRole("radio", { name: "Warning" });
     await user.click(warningToggle);
     expect(screen.getByText("Add Warning")).toBeInTheDocument();
   });
 });

 describe("validateFineForm", () => {
   it("validates required fields correctly", () => {
     const validForm = {
       subject_id: "1",
       description: "Test description",
       amount: 10
     };

     const result = validateFineForm(validForm, "Fine");
     expect(result.valid).toBe(true);
     expect(result.errors).toEqual({});
   });

   it("returns error for missing subject_id", () => {
     const invalidForm = {
       subject_id: "",
       description: "Test description",
       amount: 10
     };

     const result = validateFineForm(invalidForm, "Fine");
     expect(result.valid).toBe(false);
     expect(result.errors.subject_id).toBe("Subject is required.");
   });

   it("returns error for missing description", () => {
     const invalidForm = {
       subject_id: "1",
       description: "",
       amount: 10
     };

     const result = validateFineForm(invalidForm, "Fine");
     expect(result.valid).toBe(false);
     expect(result.errors.description).toBe("Description is required.");
   });

   it("returns error for invalid amount in Fine type", () => {
     const invalidForm = {
       subject_id: "1",
       description: "Test description",
       amount: 0
     };

     const result = validateFineForm(invalidForm, "Fine");
     expect(result.valid).toBe(false);
     expect(result.errors.amount).toBe("Amount must be greater than zero.");
   });

   it("allows zero amount for Warning type", () => {
     const form = {
       subject_id: "1",
       description: "Test description",
       amount: 0
     };

     const result = validateFineForm(form, "Warning");
     expect(result.valid).toBe(true);
     expect(result.errors).toEqual({});
   });
 });
