import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { suiClient, getIssuerKeypair, SUI_PACKAGE_ID, SUI_SCHEMA_ID, DID_OBJECT_ID } from '../config/suiClient';

const issuerKeypair = getIssuerKeypair();
const ISSUER_DID_OBJECT_ID = DID_OBJECT_ID; // DID object we created

/**
 * Creates a DIDObject on-chain for a given user.
 * The server sponsors the transaction using the issuer keypair which has SUI tokens.
 */
export const createDidForUser = async (userAddress: string) => {
    console.log(`Creating DID for user: ${userAddress}`);
    const txb = new TransactionBlock();
    
    txb.moveCall({
        target: `${SUI_PACKAGE_ID}::did_manager::create_did`,
        arguments: [],
    });

    // Use the issuer keypair to sign and pay for the transaction
    const result = await suiClient.signAndExecuteTransactionBlock({
        signer: issuerKeypair,
        transactionBlock: txb,
        options: { showEffects: true, showObjectChanges: true },
    });

    console.log("DID creation tx digest:", result.digest);

    // Find the created DID object ID from the result
    const createdObject = result.objectChanges?.find(
        (change) => change.type === 'created'
    );
    if (createdObject && 'objectId' in createdObject) {
        console.log("Created DID object:", createdObject.objectId);
        return createdObject.objectId;
    }
    throw new Error("Could not find created DID object ID");
};


/**
 * Issues a Verifiable Credential from the server's issuer DID to a recipient address.
 */
export const issueKycVc = async (recipientAddress: string, firstName: string, lastName: string, dob: string, nationalId: string, address: string) => {
    console.log('issueKycVc called with:', { recipientAddress, firstName, lastName, dob, nationalId, address });
    console.log(`Issuing KYC VC for ${recipientAddress}`);
    
    // First, verify that the schema exists
    let schemaId = SUI_SCHEMA_ID;
    const schemaExists = await verifyObjectExists(schemaId);
    
    if (!schemaExists) {
        console.log("Schema does not exist, creating new one...");
        schemaId = await createKycSchema();
        console.log("Created new schema with ID:", schemaId);
    } else {
        console.log("Using existing schema:", schemaId);
    }
    
    const txb = new TransactionBlock();

    // In a real system, the proof would be a cryptographic signature
    const fakeProofBytes = Array.from(Buffer.from("signature_would_go_here", 'utf8'));

    // Debug log: print the fields and values being sent to the Move contract
    console.log('Preparing to issue VC with the following arguments:');
    console.log('  issuer_did (shared object ref):', ISSUER_DID_OBJECT_ID, typeof ISSUER_DID_OBJECT_ID);
    console.log('  schema (shared object ref):', schemaId, typeof schemaId);
    console.log('  recipient_address:', recipientAddress, typeof recipientAddress);
    console.log('  first_name:', firstName, typeof firstName);
    console.log('  last_name:', lastName, typeof lastName);
    console.log('  date_of_birth:', dob, typeof dob);
    console.log('  national_id:', nationalId, typeof nationalId);
    console.log('  address:', address, typeof address);
    console.log('  proof (vector<u8>):', fakeProofBytes, Array.isArray(fakeProofBytes) ? 'array' : typeof fakeProofBytes);
    console.log('  clock (shared object ref):', '0x6', typeof '0x6');

    txb.moveCall({
        target: `${SUI_PACKAGE_ID}::vc_manager::issue_vc`,
        arguments: [
            txb.object(ISSUER_DID_OBJECT_ID),
            txb.object(schemaId),
            txb.pure(recipientAddress, 'address'),
            txb.pure(firstName, 'string'),
            txb.pure(lastName, 'string'),
            txb.pure(dob, 'string'),
            txb.pure(nationalId, 'string'),
            txb.pure(address, 'string'),
            txb.pure(fakeProofBytes, 'vector<u8>'),
            txb.object('0x6'), // Clock object ID (system clock)
        ],
    });

    const result = await suiClient.signAndExecuteTransactionBlock({
        signer: issuerKeypair,
        transactionBlock: txb,
        options: { showEffects: true, showObjectChanges: true },
    });

    console.log("VC Issuance tx digest:", result.digest);

    const createdVc = result.objectChanges?.find(
        (change: any) =>
            change.type === 'created' && change.objectType.includes('::vc_manager::VCObject')
    );

    if (createdVc && 'objectId' in createdVc) {
        return {
            transactionDigest: result.digest,
            vcObjectId: createdVc.objectId,
        };
    }

    throw new Error("VC Object ID not found in transaction result");
};


/**
 * Creates a schema object for KYC credentials.
 * This should be called once during setup.
 */
export const createKycSchema = async () => {
    console.log("Creating KYC schema...");
    const txb = new TransactionBlock();
    
    const schemaName = "KYC_Credential";
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'nationalId', 'address'];
    
    txb.moveCall({
        target: `${SUI_PACKAGE_ID}::vc_manager::create_schema`,
        arguments: [
            txb.pure(schemaName, 'string'),
            txb.pure(requiredFields, 'vector<string>'),
        ],
    });

    const result = await suiClient.signAndExecuteTransactionBlock({
        signer: issuerKeypair,
        transactionBlock: txb,
        options: { showEffects: true, showObjectChanges: true },
    });

    console.log("Schema creation tx digest:", result.digest);

    // Find the created schema object ID from the result
    const createdObject = result.objectChanges?.find(
        (change) => change.type === 'created' && 
        'objectType' in change && 
        change.objectType.includes('::vc_manager::SchemaObject')
    );
    
    if (createdObject && 'objectId' in createdObject) {
        console.log("Created schema object:", createdObject.objectId);
        return createdObject.objectId;
    }
    throw new Error("Could not find created schema object ID");
};


/**
 * Verifies if an object exists on-chain and returns its details
 */
export const verifyObjectExists = async (objectId: string) => {
    try {
        const object = await suiClient.getObject({
            id: objectId,
            options: { showContent: true, showType: true }
        });
        
        console.log(`Object ${objectId} exists:`, object.data);
        return object.data;
    } catch (error) {
        console.error(`Object ${objectId} does not exist or error fetching:`, error);
        return null;
    }
};