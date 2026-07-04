import * as SecureStore from 'expo-secure-store';

// Límite práctico del Keychain para un item (iOS tolera más pero está desaconsejado).
export const SECURE_BODY_LIMIT = 2000;

export class SecureBodyError extends Error {
  kind: 'too-long';
  constructor(kind: 'too-long') {
    super(kind);
    this.kind = kind;
    this.name = 'SecureBodyError';
  }
}

export function utf8ByteLength(s: string): number {
  let bytes = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}

const keyFor = (noteId: string) => `note-body-${noteId}`;

export async function saveSecureBody(noteId: string, body: string): Promise<void> {
  if (utf8ByteLength(body) > SECURE_BODY_LIMIT) throw new SecureBodyError('too-long');
  await SecureStore.setItemAsync(keyFor(noteId), body, {
    requireAuthentication: true,
    authenticationPrompt: 'Desbloqueá para guardar la nota cifrada',
  });
}

export async function readSecureBody(noteId: string): Promise<string | null> {
  return SecureStore.getItemAsync(keyFor(noteId), {
    requireAuthentication: true,
    authenticationPrompt: 'Desbloqueá para ver la nota',
  });
}

export async function deleteSecureBody(noteId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(keyFor(noteId));
  } catch {
    /* no existía: ok */
  }
}
