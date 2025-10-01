/**
 * Canonical AEAD cipher metadata compiled from the Outline and Shadowsocks
 * client implementations. The shapes of the objects mirror the metadata used
 * in the Outline client to validate access keys.
 */
export const AEAD_CIPHERS = [
  {
    name: 'aes-128-gcm',
    keyBytes: 16,
    nonceBytes: 12,
    tagBytes: 16,
    description: 'AES-GCM with 128-bit keys (Outline default).'
  },
  {
    name: 'aes-192-gcm',
    keyBytes: 24,
    nonceBytes: 12,
    tagBytes: 16,
    description: 'AES-GCM with 192-bit keys.'
  },
  {
    name: 'aes-256-gcm',
    keyBytes: 32,
    nonceBytes: 12,
    tagBytes: 16,
    description: 'AES-GCM with 256-bit keys.'
  },
  {
    name: 'chacha20-ietf-poly1305',
    keyBytes: 32,
    nonceBytes: 12,
    tagBytes: 16,
    description: 'ChaCha20-Poly1305 (IETF variant).'
  },
  {
    name: 'xchacha20-ietf-poly1305',
    keyBytes: 32,
    nonceBytes: 24,
    tagBytes: 16,
    description: 'XChaCha20-Poly1305 for extended nonces.'
  }
];

export function isSupportedCipher(cipherName) {
  return AEAD_CIPHERS.some(cipher => cipher.name === cipherName);
}
// Updated: 2025-10-01
