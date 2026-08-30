-- DropIndex
DROP INDEX "expenses_recurringExpenseId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "expenses_recurringExpenseId_date_key" ON "expenses"("recurringExpenseId", "date");
