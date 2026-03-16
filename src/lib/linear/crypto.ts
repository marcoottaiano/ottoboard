import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const raw = process.env.LINEAR_ENCRYPTION_KEY
  if (!raw) throw new Error('LINEAR_ENCRYPTION_KEY env var is not set')
  const buf = Buffer.from(raw, 'hex')
  if (buf.length !== 32) throw new Error('LINEAR_ENCRYPTION_KEY must be 32 bytes (64 hex chars)')
  return buf
}

/**
 * Encrypts a plaintext string.
 * Returns a base64 string: `iv:authTag:ciphertext` (all base64-encoded).
 */
export function encryptApiKey(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':')
}

/**
 * Decrypts a value produced by `encryptApiKey`.
 */
export function decryptApiKey(encrypted: string): string {
  const key = getKey()
  const parts = encrypted.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted API key format')
  const [ivB64, authTagB64, ciphertextB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
