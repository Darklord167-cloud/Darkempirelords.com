import { Connection, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import bs58 from "bs58";

// Ensure this is only used on the server side
if (typeof window !== "undefined") {
  console.warn("lib/solana.ts should only be imported on the server side.");
}

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

// Initialize Solana Connection
export const connection = new Connection(RPC_URL, "confirmed");

// Initialize Operator Keypair from environment variable
// The private key should be a base58 string Exported from Phantom or similar, or a JSON array string.
export function getOperatorKeypair(): Keypair {
  const privateKey = process.env.OPERATOR_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error("OPERATOR_PRIVATE_KEY environment variable is not set");
  }

  try {
    // Try parsing as JSON array first (standard solana CLI format)
    if (privateKey.startsWith("[")) {
      const secretKey = new Uint8Array(JSON.parse(privateKey));
      return Keypair.fromSecretKey(secretKey);
    } 
    // Otherwise try parsing as Base58 (Phantom/Solflare format)
    else {
      const secretKey = bs58.decode(privateKey);
      return Keypair.fromSecretKey(secretKey);
    }
  } catch (error) {
    console.error("Failed to parse OPERATOR_PRIVATE_KEY", error);
    throw new Error("Invalid OPERATOR_PRIVATE_KEY format. Must be a valid Base58 string or JSON array.");
  }
}

// Initialize Anchor Provider
export function getAnchorProvider(): anchor.AnchorProvider {
  const operatorKeypair = getOperatorKeypair();
  const wallet = new anchor.Wallet(operatorKeypair);
  
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    { preflightCommitment: "confirmed" }
  );
  
  anchor.setProvider(provider);
  return provider;
}
