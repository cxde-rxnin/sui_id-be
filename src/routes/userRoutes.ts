import express from 'express';
import { 
  registerUser, 
  issueKycCredential,
  createUserDid,
  checkUserDid,
  getUserCredentials,
  createCredential,
  verifyCredential
} from '../controllers/userController';

const router = express.Router();

// Original routes
router.post('/register', registerUser);
router.post('/issue-kyc', issueKycCredential);

// New DID routes
router.get('/:userAddress/did', checkUserDid);
router.post('/:userAddress/did', createUserDid);

// Credential routes
router.get('/:userAddress/credentials', getUserCredentials);
router.post('/credentials', createCredential);
router.post('/verify', verifyCredential);

export default router;