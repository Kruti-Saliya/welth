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
  balance: number;
  isDefault?: boolean;
};

// Define type for Account with serialized balance
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

export async function createAccount(
  data: TAccountData
): Promise<{ success: boolean; data: ISerializedAccount }> {
  try {
    const { userId } = await auth();

    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const balanceFloat = Number(data.balance);
    if (isNaN(balanceFloat)) throw new Error("Invalid balance amount");

    const existingAccounts = await db.account.findMany({
      where: {
        userId: user.id,
      },
    });

    const shouldBeDefault =
      existingAccounts.length === 0 ? true : !!data.isDefault;

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
        isDefault: shouldBeDefault,
      },
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

export async function getUserAccounts() {
  const { userId } = await auth();

  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  try {
    const accounts = await db.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    // Serialize accounts before sending to client
    const serializedAccounts = accounts.map(serializeTransaction);

    return serializedAccounts;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unknown error occurred");
  }
}

export async function getDashboardData() {
  const  { userId } = await auth();
   if (!userId) throw new Error("Unauthorized");
   
   const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
   })
   if (!user) {
      throw new Error("User not found");
   }
   const transactions = await db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
   });

   return transactions.map(serializeTransaction);
}