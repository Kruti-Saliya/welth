import { seedTransactions } from "@/actions/seed";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  try {
    const result = await seedTransactions();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 }
    );
  }
}