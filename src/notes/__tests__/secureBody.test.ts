import { utf8ByteLength, SECURE_BODY_LIMIT } from '../secureBody';

describe('utf8ByteLength', () => {
  it('cuenta bytes UTF-8, no chars', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('ñ')).toBe(2);
    expect(utf8ByteLength('€')).toBe(3);
    expect(utf8ByteLength('🔒')).toBe(4);
  });
  it('el límite es 2000 bytes', () => {
    expect(SECURE_BODY_LIMIT).toBe(2000);
  });
});
