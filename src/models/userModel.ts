import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    suiAddress: string;
    username: string;
    didObjectId?: string;
}

const UserSchema: Schema = new Schema({
    suiAddress: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true },
    didObjectId: { type: String, required: false },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);