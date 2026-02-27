# Ticket Validation and Registration Plan

This document outlines the plan to enhance the user registration process by introducing explicit modes for "walk-in" and "reservation" based check-ins.

## 1. Goal

The primary goal is to modify the `registerUser` Convex mutation to accept a `mode` parameter. This parameter will determine the validation logic to be used:
- **`walk_in`**: Uses the existing logic, validating a `plan` string from the QR code.
- **`reservation`**: Uses the new ticket validation logic, looking for an active, confirmed ticket for the user.

## 2. Technical Plan

### Step 1: Update Database Schema

-   **File**: `convex/schema.ts`
-   **Change**: Add a new optional field `ticketId` to the `daily_register` table. This will store a reference to the ticket used for a reservation-based check-in.

    ```typescript
    const daily_register = defineTable({
      // ... existing fields
      ticketId: v.optional(v.id("tickets")), // New field
      // ... existing fields
    }).index("by_ticket", ["ticketId"]); // New index
    ```

### Step 2: Modify `registerUser` Mutation

-   **File**: `convex/myFunctions.ts`
-   **Change**: Rework the `registerUser` mutation handler to use a `mode` parameter.

1.  **Arguments**:
    -   Add a `mode` argument: `mode: v.union(v.literal("walk_in"), v.literal("reservation"))`.
    -   The `plan` argument will be used only for `walk_in` mode.
    -   The `ticket_reference` argument will be removed.

2.  **Conditional Validation Logic**:
    -   The handler will use a conditional statement (e.g., `if` or `switch`) on `args.mode`.
    -   **If `mode === 'reservation'`**:
        -   The system will execute the ticket validation logic: find an active ticket for the `customerId`.
        -   The `access` object will be constructed from the booking details.
        -   The `daily_register` entry will be created with the `ticketId`.
        -   If no active ticket is found, a `ConvexError` will be thrown.
    -   **If `mode === 'walk_in'`**:
        -   The system will execute the existing logic, using `PlanImpl.validatePlan(ctx.db, args.plan)`.
        -   The `daily_register` entry will be created without a `ticketId`.

### Step 3: Update Frontend to Provide Mode

-   **File**: `components/TakeAttendance.tsx`
-   **Change**: The frontend component will be updated to allow the user to select the check-in mode and pass it to the `registerUser` mutation.
    -   A UI element (e.g., a toggle or buttons for "Walk-in" and "Reservation") will be added.
    -   The `handleScan` function will be updated to pass the selected `mode` in the call to the `register` mutation.

This approach provides a clear and explicit way to handle different types of user check-ins, making the system more robust and easier to maintain.


