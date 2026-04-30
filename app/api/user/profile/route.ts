import { NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function POST(req: Request) {
  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return NextResponse.json({ message: "Wallet address required" }, { status: 400 });
    }

    let user = await storage.getUserByWalletAddress(walletAddress);

    if (!user) {
      user = await storage.createUser({
        username: `wallet_${walletAddress.slice(0, 8)}`,
        walletAddress,
        password: null as any,
      });
    }

    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
