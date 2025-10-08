import mongoose, { Document, Schema } from 'mongoose';

export interface ICredential extends Document {
    userAddress: string;
    credentialData: {
        fullName: string;
        dateOfBirth: string;
        nationalId: string;
        address: string;
    };
    issuedAt: Date;
    suiVcId?: string;
    transactionDigest?: string;
    isRevoked: boolean;
}

const CredentialSchema: Schema = new Schema({
    userAddress: { type: String, required: true, index: true },
    credentialData: {
        fullName: { type: String, required: true },
        dateOfBirth: { type: String, required: true },
        nationalId: { type: String, required: true },
        address: { type: String, required: true },
    },
    issuedAt: { type: Date, default: Date.now },
    suiVcId: { type: String, required: false },
    transactionDigest: { type: String, required: false },
    isRevoked: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<ICredential>('Credential', CredentialSchema);
