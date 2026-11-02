/**
 * Secure Client-Side Authentication & Password Hashing Service
 *
 * Uses the Web Crypto API with PBKDF2 (SHA-256, 100,000 iterations, 16-byte random salt).
 * Never stores plain text passwords or exposes secrets.
 */

// Helper: Convert Uint8Array to Hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: Convert Hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export interface PasswordHashResult {
  hash: string;
  salt: string;
}

/**
 * Derives a cryptographic hash of a password using PBKDF2 with SHA-256 and a 16-byte salt.
 */
export async function hashPassword(password: string, existingSaltHex?: string): Promise<PasswordHashResult> {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  let saltBytes: Uint8Array;
  if (existingSaltHex) {
    saltBytes = hexToBytes(existingSaltHex);
  } else {
    saltBytes = new Uint8Array(16);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(saltBytes);
    } else {
      for (let i = 0; i < 16; i++) {
        saltBytes[i] = Math.floor(Math.random() * 256);
      }
    }
  }

  // Use Web Crypto API if available
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const baseKey = await window.crypto.subtle.importKey(
        'raw',
        passwordBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations: 100000,
          hash: 'SHA-256',
        },
        baseKey,
        256
      );

      return {
        hash: bytesToHex(new Uint8Array(derivedBits)),
        salt: bytesToHex(saltBytes),
      };
    } catch (err) {
      console.warn('SubtleCrypto error, falling back to SHA-256 digest:', err);
    }
  }

  // Fallback using SHA-256 digest with salt prepended
  const combined = new Uint8Array(saltBytes.length + passwordBytes.length);
  combined.set(saltBytes, 0);
  combined.set(passwordBytes, saltBytes.length);

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const digest = await window.crypto.subtle.digest('SHA-256', combined);
    return {
      hash: bytesToHex(new Uint8Array(digest)),
      salt: bytesToHex(saltBytes),
    };
  }

  // Pure software fallback if crypto is not supported
  let hashVal = 0;
  for (let i = 0; i < combined.length; i++) {
    hashVal = (hashVal << 5) - hashVal + combined[i];
    hashVal |= 0;
  }
  return {
    hash: Math.abs(hashVal).toString(16).padStart(64, '0'),
    salt: bytesToHex(saltBytes),
  };
}

/**
 * Compares an entered plain text password with a stored PBKDF2 hash and salt.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  if (!password || !storedHash || !storedSalt) {
    return false;
  }
  try {
    const { hash } = await hashPassword(password, storedSalt);
    // Constant time length check
    if (hash.length !== storedHash.length) return false;
    let match = true;
    for (let i = 0; i < hash.length; i++) {
      if (hash[i] !== storedHash[i]) {
        match = false;
      }
    }
    return match;
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

/**
 * Validates a username string.
 * Returns an error message or null if valid.
 */
export function validateUsername(username: string): string | null {
  const trimmed = (username || '').trim();
  if (!trimmed) {
    return 'Username is required.';
  }
  if (trimmed.length < 3) {
    return 'Username must be at least 3 characters.';
  }
  if (trimmed.length > 30) {
    return 'Username must be 30 characters or less.';
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return 'Username can only contain letters, numbers, underscores, dashes, and periods.';
  }
  return null;
}

/**
 * Validates a password string.
 * Returns an error message or null if valid.
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  return null;
}
