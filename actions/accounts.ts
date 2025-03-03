"use server"
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Account, Transaction } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { revalidatePath } from "next/cache";

export interface ISerializedAccount extends Omit<Account, "balance"> {
  balance: number;
  amount?: number;
}

const serializeTransaction = (account: Account): ISerializedAccount => {
  const serializedAccount: ISerializedAccount = {
    ...account,
    balance:
      account.balance instanceof Decimal
        ? account.balance.toNumber()
        : Number(account.balance),
  };

  if ("amount" in account && account.amount instanceof Decimal) {
    serializedAccount.amount = account.amount.toNumber();
  }

  return serializedAccount;
};

const serializeTransactionData = (transaction: Transaction) => {
  return {
    ...transaction,
    amount:
      transaction.amount instanceof Decimal
        ? transaction.amount.toNumber()
        : Number(transaction.amount),
  };
};

export async function getAccountWithTransactions(accountId:string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const account = await db.account.findUnique({
    where: {
      id: accountId,
      userId: user.id,
    },
    include: {
      transactions: {
        orderBy: { date: "desc" },
      },
      _count: {
        select: { transactions: true },
      },
    },
  });

  if (!account) return null;

  return {
    ...serializeTransaction(account),
    transactions: account.transactions.map(serializeTransactionData),
    _count: account._count, 
  };
}


export async function updateDefaultAccount(accountId:string) {
    try {
      const { userId } = await auth();
      if (!userId) throw new Error("Unauthorized");
  
      const user = await db.user.findUnique({
        where: { clerkUserId: userId },
      });
  
      if (!user) {
        throw new Error("User not found");
      }
  
      await db.account.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
        },
        data: { isDefault: false },
      });
  
      const account = await db.account.update({
        where: {
          id: accountId,
          userId: user.id,
        },
        data: { isDefault: true },
      });
  
      revalidatePath("/dashboard");
      return { success: true, data: serializeTransaction(account) };
    } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : "An unknown error occurred" 
        };
      }
  }