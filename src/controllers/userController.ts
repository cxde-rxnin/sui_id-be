import { Request, Response } from 'express';
import User from '../models/userModel';
import Credential from '../models/credentialModel';
import { issueKycVc, createDidForUser } from '../services/suiService';

// @desc   Register a new user with their Sui Address
// @route  POST /api/users/register
export const registerUser = async (req: Request, res: Response) => {
    const { suiAddress, username } = req.body;
    if (!suiAddress || !username) {
        return res.status(400).json({ message: 'Sui address and username are required' });
    }

    try {
        const userExists = await User.findOne({ $or: [{ suiAddress }, { username }] });
        if (userExists) {
            return res.status(400).json({ message: 'User with this address or username already exists' });
        }

        const user = await User.create({ suiAddress, username });
        res.status(201).json({
            _id: user._id,
            suiAddress: user.suiAddress,
            username: user.username,
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
};

// @desc   Issue a KYC credential to a registered user
// @route  POST /api/users/issue-kyc
export const issueKycCredential = async (req: Request, res: Response) => {
    const { suiAddress, firstName, lastName, dateOfBirth } = req.body;
    if (!suiAddress || !firstName || !lastName || !dateOfBirth) {
        return res.status(400).json({ message: 'suiAddress, firstName, lastName, and dateOfBirth are required' });
    }

    try {
        const user = await User.findOne({ suiAddress });
        if (!user) {
            return res.status(404).json({ message: 'User not found with this Sui address' });
        }

        const result = await issueKycVc(suiAddress, firstName, lastName, dateOfBirth);

        res.status(200).json({
            message: 'KYC Credential issued successfully!',
            ...result
        });
    } catch (error: any) {
        console.error("Error issuing KYC VC:", error);
        res.status(500).json({ message: 'Server error during VC issuance', error: error.message });
    }
};

// @desc   Check if user has a DID
// @route  GET /api/users/:userAddress/did
export const checkUserDid = async (req: Request, res: Response) => {
    const { userAddress } = req.params;

    try {
        const user = await User.findOne({ suiAddress: userAddress });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            hasDid: !!user.didObjectId,
            didId: user.didObjectId
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error checking DID', error: error.message });
    }
};

// @desc   Create DID for user
// @route  POST /api/users/:userAddress/did
export const createUserDid = async (req: Request, res: Response) => {
    const { userAddress } = req.params;

    try {
        let user = await User.findOne({ suiAddress: userAddress });
        if (!user) {
            // Create user if doesn't exist
            user = await User.create({ 
                suiAddress: userAddress, 
                username: `user_${userAddress.slice(0, 8)}` 
            });
        }

        if (user.didObjectId) {
            return res.status(400).json({ message: 'User already has a DID' });
        }

        // Create DID on-chain with server sponsoring the transaction
        const didObjectId = await createDidForUser(userAddress);

        user.didObjectId = didObjectId;
        await user.save();

        res.status(201).json({
            didId: didObjectId,
            message: 'DID created successfully'
        });
    } catch (error: any) {
        console.error('Error creating DID:', error);
        res.status(500).json({ message: 'Server error creating DID', error: error.message });
    }
};

// @desc   Get user credentials
// @route  GET /api/users/:userAddress/credentials
export const getUserCredentials = async (req: Request, res: Response) => {
    const { userAddress } = req.params;

    try {
        const credentials = await Credential.find({ 
            userAddress: userAddress,
            isRevoked: false 
        }).sort({ issuedAt: -1 });

        // Convert MongoDB documents to plain objects and ensure _id is converted to id
        const formattedCredentials = credentials.map(cred => {
            const credObj = cred.toJSON();
            return {
                ...credObj,
                id: credObj._id || credObj.id
            };
        });

        res.status(200).json(formattedCredentials);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error fetching credentials', error: error.message });
    }
};

// @desc   Create a new credential
// @route  POST /api/users/credentials
export const createCredential = async (req: Request, res: Response) => {
    const { userAddress, credentialData } = req.body;

    if (!userAddress || !credentialData) {
        return res.status(400).json({ message: 'User address and credential data are required' });
    }

    const { fullName, dateOfBirth, nationalId, address } = credentialData;
    if (!fullName || !dateOfBirth || !nationalId || !address) {
        return res.status(400).json({ 
            message: 'Full name, date of birth, national ID, and address are required' 
        });
    }

    try {
        // Check if user exists and has DID
        const user = await User.findOne({ suiAddress: userAddress });
        if (!user || !user.didObjectId) {
            return res.status(400).json({ message: 'User must have a DID before creating credentials' });
        }

        // Issue VC on Sui blockchain
        const [firstName, ...lastNameParts] = fullName.split(' ');
        const lastName = lastNameParts.join(' ') || '';
        
        const vcResult = await issueKycVc(userAddress, firstName, lastName, dateOfBirth);

        // Store credential in database
        const credential = await Credential.create({
            userAddress,
            credentialData,
            suiVcId: vcResult.vcObjectId,
            transactionDigest: vcResult.transactionDigest
        });

        // Format credential response
        const credentialObj = credential.toJSON();
        const formattedCredential = {
            ...credentialObj,
            id: credentialObj._id || credentialObj.id
        };

        res.status(201).json(formattedCredential);
    } catch (error: any) {
        console.error('Error creating credential:', error);
        res.status(500).json({ message: 'Server error creating credential', error: error.message });
    }
};

// @desc   Verify a credential
// @route  POST /api/users/verify
export const verifyCredential = async (req: Request, res: Response) => {
    const { userAddress, vcId } = req.body;

    if (!userAddress || !vcId) {
        return res.status(400).json({ message: 'User address and VC ID are required' });
    }

    try {
        // Find credential in database
        let credential = null;
        
        // First try to find by suiVcId (for Sui object IDs)
        credential = await Credential.findOne({ 
            userAddress: userAddress,
            suiVcId: vcId,
            isRevoked: false 
        });
        
        // If not found and vcId looks like a MongoDB ObjectId, try _id
        if (!credential && vcId.length === 24 && /^[0-9a-fA-F]+$/.test(vcId)) {
            credential = await Credential.findOne({ 
                userAddress: userAddress,
                _id: vcId,
                isRevoked: false 
            });
        }

        if (!credential) {
            return res.status(200).json({
                isValid: false,
                hasAccess: false,
                message: 'Credential not found or has been revoked'
            });
        }

        // For this PoC, we'll consider any non-revoked credential as valid
        // In a real system, you would verify the credential on-chain
        const isValid = !credential.isRevoked;
        const hasAccess = isValid && credential.credentialData.fullName;

        res.status(200).json({
            isValid,
            hasAccess,
            message: hasAccess 
                ? 'Credential verified successfully! Access granted.' 
                : 'Credential verification failed.'
        });
    } catch (error: any) {
        console.error('Error verifying credential:', error);
        res.status(500).json({ message: 'Server error verifying credential', error: error.message });
    }
};