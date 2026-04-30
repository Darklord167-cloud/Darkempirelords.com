import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia" as any,
});

export async function POST(req: Request) {
  try {
    const { amount, walletAddress, successUrl, cancelUrl } = await req.json();

    if (!amount || !walletAddress) {
      return NextResponse.json(
        { message: "Amount and wallet address are required" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Dark Empire Credits",
              description: `Credits for wallet: ${walletAddress}`,
            },
            unit_amount: amount * 100, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        walletAddress,
        credits: amount.toString(),
      },
      success_url: successUrl || `${req.headers.get("origin")}/credits?success=true`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/credits?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Error:", err);
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
