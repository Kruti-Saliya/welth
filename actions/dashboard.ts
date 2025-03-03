"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { AccountType, Account } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// Define type for the Account data input
type TAccountData = {
  name: string;
  type: AccountType;
  balance: string;
  isDefault?: boolean;
}

// Define type for Account with serialized balance
interface ISerializedAccount extends Omit<Account, 'balance'> {
  balance: number;
}

// Function to convert Decimal balance to number
const serializeTransaction = (account: Account): ISerializedAccount => {
  return {
    ...account,
    balance: account.balance instanceof Decimal 
      ? account.balance.toNumber() 
      : Number(account.balance)
  };
};

export async function createAccount(data: TAccountData): Promise<{ success: boolean; data: ISerializedAccount }> {
  try {
    const { userId } = await auth();
    
    if (!userId) throw new Error("Unauthorized");
    
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId
      },
    });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const balanceFloat = parseFloat(data.balance);
    if (isNaN(balanceFloat)) throw new Error("Invalid balance amount");
    
    const existingAccounts = await db.account.findMany({
      where: {
        userId: user.id
      },
    });
    
    const shouldBeDefault = existingAccounts.length === 0 ? true : !!data.isDefault;
    
    if (shouldBeDefault) {
      await db.account.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }
    
    const account = await db.account.create({
      data: {
        name: data.name,
        type: data.type,
        balance: balanceFloat,
        userId: user.id,
        isDefault: shouldBeDefault
      }
    });
    
    const serializedAccount = serializeTransaction(account);
    
    revalidatePath("/dashboard");
    return { success: true, data: serializedAccount };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unknown error occurred");
  }
}