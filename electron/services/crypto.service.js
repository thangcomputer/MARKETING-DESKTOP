/**
 * Crypto Service — AES-256-GCM encryption for sensitive tokens
 * Keys are derived from a machine-local secret stored in AppSetting.
 */
'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive a 32-byte key from an arbitrary-length secret.
 */
function deriveKey(secret) {
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypt a plaintext string → base64 blob ("iv:tag:ciphertext").
 */
function encrypt(plaintext, secret) {
  if (!plaintext) return null;
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Decrypt a base64 blob back to plaintext.
 */
function decrypt(blob, secret) {
  if (!blob) return null;
  try {
    const [ivHex, tagHex, encHex] = blob.split(':');
    const key = deriveKey(secret);
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final('utf8');
  } catch {
    return null; // bad key or tampered data
  }
}

module.exports = { encrypt, decrypt };
