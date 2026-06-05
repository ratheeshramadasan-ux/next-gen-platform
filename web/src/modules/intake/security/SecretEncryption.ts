import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.INTAKE_SECRET_KEY || 'default-intake-secret-key-32-chars-!!';

export class SecretEncryption {
    /**
     * Encrypts a sensitive value (password, secret key, etc.)
     */
    static encrypt(value: string): string {
        if (!value) return '';
        return CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
    }

    /**
     * Decrypts an encrypted value
     */
    static decrypt(ciphertext: string): string {
        if (!ciphertext) return '';
        try {
            const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('[SecretEncryption] Decryption failed:', error);
            return '';
        }
    }

    /**
     * Processes a configuration object, encrypting specified sensitive fields
     */
    static encryptConfig(config: Record<string, any>, sensitiveFields: string[]): Record<string, any> {
        const encryptedConfig = { ...config };
        for (const field of sensitiveFields) {
            if (encryptedConfig[field]) {
                encryptedConfig[field] = this.encrypt(encryptedConfig[field]);
            }
        }
        return encryptedConfig;
    }

    /**
     * Processes a configuration object, decrypting specified sensitive fields
     */
    static decryptConfig(config: Record<string, any>, sensitiveFields: string[]): Record<string, any> {
        const decryptedConfig = { ...config };
        for (const field of sensitiveFields) {
            if (decryptedConfig[field]) {
                decryptedConfig[field] = this.decrypt(decryptedConfig[field]);
            }
        }
        return decryptedConfig;
    }
}
