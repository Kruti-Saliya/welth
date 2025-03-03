"use server";

import { db } from "@/lib/prisma";
import { subDays } from "date-fns";
import { TransactionType, TransactionStatus } from "@prisma/client";

const ACCOUNT_ID = "275bbd56-263f-4716-9228-d2d0e4f307c4";
const USER_ID = "c1c74908-ce9e-4b9a-8fdb-da56f47bf73d";

interface Category {
  name: string;
  range: [number, number];
}

const CATEGORIES: Record<TransactionType, Category[]> = {
  INCOME: [
    { name: "salary", range: [5000, 8000] },
    { name: "freelance", range: [1000, 3000] },
    { name: "investments", range: [500, 2000] },
    { name: "other-income", range: [100, 1000] },
  ],
  EXPENSE: [
    { name: "housing", range: [1000, 2000] },
    { name: "transportation", range: [100, 500] },
    { name: "groceries", range: [200, 600] },
    { name: "utilities", range: [100, 300] },
    { name: "entertainment", range: [50, 200] },
    { name: "food", range: [50, 150] },
    { name: "shopping", range: [100, 500] },
    { name: "healthcare", range: [100, 1000] },
    { name: "education", range: [200, 1000] },
    { name: "travel", range: [500, 2000] },
  ],
};

// Helper to generate a random amount within a range
function getRandomAmount(min: number, max: number): number {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

// Helper to get a random category with amount
function getRandomCategory(type: TransactionType): { category: string; amount: number } {
  const categories = CATEGORIES[type];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const amount = getRandomAmount(category.range[0], category.range[1]);
  return { category: category.name, amount };
}

export async function seedTransactions(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const transactions: Array<{
      id: string;
      type: TransactionType;
      amount: number;
      description: string;
      date: Date;
      category: string;
      status: TransactionStatus;
      userId: string;
      accountId: string;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    let totalBalance = 0;

    for (let i = 90; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const transactionsPerDay = Math.floor(Math.random() * 3) + 1;

      for (let j = 0; j < transactionsPerDay; j++) {
        const type: TransactionType = Math.random() < 0.4 ? "INCOME" : "EXPENSE";
        const { category, amount } = getRandomCategory(type);

        const transaction = {
          id: crypto.randomUUID(),
          type,
          amount,
          description: `${type === "INCOME" ? "Received" : "Paid for"} ${category}`,
          date,
          category,
          status: "COMPLETED" as TransactionStatus,
          userId: USER_ID,
          accountId: ACCOUNT_ID,
          createdAt: date,
          updatedAt: date,
        };

        totalBalance += type === "INCOME" ? amount : -amount;
        transactions.push(transaction);
      }
    }

    // Insert transactions in batches and update account balance
    await db.$transaction(async (tx) => {
      await tx.transaction.deleteMany({ where: { accountId: ACCOUNT_ID } });
      await tx.transaction.createMany({ data: transactions });
      await tx.account.update({ where: { id: ACCOUNT_ID }, data: { balance: totalBalance } });
    });

    return { success: true, message: `Created ${transactions.length} transactions` };
  } catch (error) {
    console.error("Error seeding transactions:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}
