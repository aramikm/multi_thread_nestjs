import { parentPort } from 'worker_threads';
import * as crypto from 'crypto';

const ALGORITHM = 'chacha20-poly1305';
const IV_LENGTH = 12; // 96-bit nonce for ChaCha20-Poly1305
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag
const KEY_LENGTH = 32; // 256-bit key

function encryptWithKey(text: string, keyBuffer: Buffer): string {
  const nonce = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, nonce, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: nonce:authTag:ciphertext
  return nonce.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decryptWithKey(encryptedText: string, keyBuffer: Buffer): string {
  const parts = encryptedText.split(':');
  const nonce = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, nonce, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Keep the worker alive and listen for messages
if (parentPort) {
  parentPort.on('message', (message) => {
    const { data, key, operation } = message;

    try {
      // CRITICAL OPTIMIZATION: Derive key ONCE per chunk instead of per item
      const keyBuffer = crypto.scryptSync(key, 'salt', KEY_LENGTH);

      // Process all items with the pre-computed key
      const results = data.map((item: string) => {
        return operation === 'encrypt' 
          ? encryptWithKey(item, keyBuffer) 
          : decryptWithKey(item, keyBuffer);
      });
      
      parentPort.postMessage(results);
    } catch (error) {
      // Send error back to main thread instead of throwing
      parentPort.postMessage({ error: error.message });
    }
  });
}

// Prevent the worker from exiting
process.on('uncaughtException', (error) => {
  console.error('Worker uncaught exception:', error);
  if (parentPort) {
    parentPort.postMessage({ error: error.message });
  }
});