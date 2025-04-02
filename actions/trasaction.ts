"use server"
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

interface Transaction {
    amount: { toNumber: () => number };
    [key: string]: unknown;
}

interface SerializedTransaction {
    amount: number;
    [key: string]: unknown;
}

const serializeAmount = (obj: Transaction): SerializedTransaction => ({
    ...obj,
    amount: obj.amount.toNumber(),
});
interface TransactionData {
  accountId: string;
  type: "EXPENSE" | "INCOME";
  amount: number;
  date: string | Date;
  isRecurring?: boolean;
  recurringInterval?: keyof RecurringInterval;
  category?: string; 
}

export async function createTransaction(data: TransactionData) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const account = await db.account.findUnique({
      where: {
        id: data.accountId,
        userId: user.id,
      },
    });
    if (!account) {
      throw new Error("Account not found");
    }
    const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = account.balance.toNumber() + balanceChange;

    const transaction = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
          userId: user.id,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
          accountId: account.id,
          category: data.category || "Uncategorized", 
        },
      });
      await tx.account.update({
        where: { id: account.id },
        data: { balance: newBalance },
      });
        return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    if (error instanceof Error) {
        throw new Error(error.message || "Failed to create transaction");
    }
    throw new Error("Failed to create transaction");
  }
}

// Helper function to calculate next recurring date
interface RecurringInterval {
    DAILY: "DAILY";
    WEEKLY: "WEEKLY";
    MONTHLY: "MONTHLY";
    YEARLY: "YEARLY";
}

function calculateNextRecurringDate(startDate: string | Date, interval: keyof RecurringInterval): Date {
    const date = new Date(startDate);

    switch (interval) {
        case "DAILY":
            date.setDate(date.getDate() + 1);
            break;
        case "WEEKLY":
            date.setDate(date.getDate() + 7);
            break;
        case "MONTHLY":
            date.setMonth(date.getMonth() + 1);
            break;
        case "YEARLY":
            date.setFullYear(date.getFullYear() + 1);
            break;
    }

    return date;
}