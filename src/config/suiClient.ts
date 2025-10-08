import { SuiClient } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Sui Client
export const suiClient = new SuiClient({ url: process.env.SUI_RPC_URL! });

// Load Issuer Keypair from environment variable
// In a real app, this should come from a secure vault (e.g., AWS KMS, HashiCorp Vault)
export const getIssuerKeypair = () => {
    const secretKeyB64 = process.env.ISSUER_SECRET_KEY!;
    if (!secretKeyB64) {
        throw new Error("ISSUER_SECRET_KEY environment variable not set!");
    }
    
    // The base64 key includes a flag byte, so we need to remove it
    const secretKeyWithFlag = fromB64(secretKeyB64);
    const secretKey = secretKeyWithFlag.slice(1); // Remove the first byte (flag)
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    
    console.log("Issuer Address:", keypair.getPublicKey().toSuiAddress());
    return keypair;
};

// Export constants from .env for easy access
export const SUI_PACKAGE_ID = process.env.SUI_PACKAGE_ID!;
export const SUI_SCHEMA_ID = process.env.SUI_SCHEMA_ID!;
export const SUI_POLICY_ID = process.env.SUI_POLICY_ID!;
export const ISSUER_ADDRESS = process.env.ISSUER_ADDRESS!;
export const DID_OBJECT_ID = process.env.DID_OBJECT_ID!;
export const UPGRADE_CAP_ID = process.env.UPGRADE_CAP_ID!;
export const DEPLOYMENT_TRANSACTION = process.env.DEPLOYMENT_TRANSACTION!;