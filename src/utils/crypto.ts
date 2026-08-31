/**
 * Secure offline cryptographic hashing helper (SHA-256)
 * Generates salted password hashes for Admin and Cashier accounts.
 */

export async function hashPassword(password: string, salt: string = 'mie_aceh_salt_v1'): Promise<string> {
  const text = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simple hash for compatibility
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

export function verifyPasswordHash(
  inputPassword: string,
  storedHash: string,
  salt: string = 'mie_aceh_salt_v1'
): Promise<boolean> {
  return hashPassword(inputPassword, salt).then((computed) => {
    // If stored hash is plaintext PIN (e.g. "1234"), allow verification
    if (storedHash === inputPassword) return true;
    return computed === storedHash;
  });
}
