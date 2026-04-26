import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  const apiKey = process.env.BIRDEYE_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: "BIRDEYE_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(`https://public-api.birdeye.so/defi/token_overview?address=${address}`, {
      headers: {
        "X-API-KEY": apiKey,
        "x-chain": "solana"
      },
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    if (!response.ok) {
      throw new Error(`Birdeye API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Birdeye API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch top data" }, { status: 500 });
  }
}
