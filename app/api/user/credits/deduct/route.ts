import { NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function POST(req: Request) {
  try {
    const { walletAddress, amount = 1 } = await req.json();
    const numAmount = parseInt(amount.toString());

    if (!walletAddress) {
      return NextResponse.json({ message: "Wallet address required" }, { status: 400 });
    }

    if (isNaN(numAmount) || numAmount < 1 || numAmount > 100) {
      return NextResponse.json({ message: "Invalid deduction amount (1-100)" }, { status: 400 });
    }

    const user = await storage.getUserByWalletAddress(walletAddress);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.credits < numAmount) {
      return NextResponse.json({ message: "Insufficient credits" }, { status: 403 });
    }

    const updatedUser = await storage.deductCredits(user.id, numAmount);

    return NextResponse.json({ success: true, credits: updatedUser?.credits });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
