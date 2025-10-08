import { createKycSchema } from './services/suiService';
import fs from 'fs';
import path from 'path';

async function setupSchema() {
    try {
        console.log("Creating KYC schema...");
        const schemaId = await createKycSchema();
        
        console.log("Schema created with ID:", schemaId);
        
        // Update the .env file with the new schema ID
        const envPath = path.join(__dirname, '../.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Replace the SUI_SCHEMA_ID line
        const schemaIdRegex = /SUI_SCHEMA_ID=.*/;
        if (schemaIdRegex.test(envContent)) {
            envContent = envContent.replace(schemaIdRegex, `SUI_SCHEMA_ID=${schemaId}`);
        } else {
            envContent += `\nSUI_SCHEMA_ID=${schemaId}`;
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log("Updated .env file with new schema ID");
        
        process.exit(0);
    } catch (error) {
        console.error("Error setting up schema:", error);
        process.exit(1);
    }
}

setupSchema();
