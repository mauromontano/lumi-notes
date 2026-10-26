import { sharedDraft } from '../draft';
test('text and links become a message; a photo or a PDF becomes an attachment', () => {
  expect(sharedDraft({ text: ' Mirá esto ', webUrl: null, files: null })).toEqual({ kind: 'text', text: 'Mirá esto' });
  expect(sharedDraft({ text: 'Una nota', webUrl: 'https://tienda.com/p/1', files: null })).toEqual({ kind: 'text', text: 'Una nota\nhttps://tienda.com/p/1' });
  expect(sharedDraft({ text: null, webUrl: 'https://tienda.com/p/1', files: null })).toEqual({ kind: 'text', text: 'https://tienda.com/p/1' });
  expect(sharedDraft({ text: null, webUrl: null, files: [{ path: 'file:///tmp/a.jpg', mimeType: 'image/jpeg', fileName: 'a.jpg', size: 1000 }] })).toEqual({ kind: 'file', uri: 'file:///tmp/a.jpg', mimeType: 'image/jpeg', fileName: 'a.jpg' });
  expect(sharedDraft({ text: 'Factura', webUrl: null, files: [{ path: 'file:///tmp/f.pdf', mimeType: 'application/pdf', fileName: 'f.pdf', size: 1000 }] })).toEqual({ kind: 'file', uri: 'file:///tmp/f.pdf', mimeType: 'application/pdf', fileName: 'f.pdf', caption: 'Factura' });
});
test('a link that is already in the text is not sent twice', () => {
  expect(sharedDraft({ text: 'Mirá esto https://x.com/a', webUrl: 'https://x.com/a', files: null })).toEqual({ kind: 'text', text: 'Mirá esto https://x.com/a' });
});
test('what Lumi cannot take says why instead of failing later', () => {
  expect(sharedDraft({ text: null, webUrl: null, files: [{ path: 'file:///tmp/v.mov', mimeType: 'video/quicktime', fileName: 'v.mov', size: 1000 }] })).toEqual({ kind: 'unsupported', reason: 'Lumi recibe fotos (JPEG, PNG, HEIC), PDF, texto y links.' });
  expect(sharedDraft({ text: null, webUrl: null, files: [{ path: 'file:///tmp/big.pdf', mimeType: 'application/pdf', fileName: 'big.pdf', size: 30 * 1024 * 1024 }] })).toEqual({ kind: 'unsupported', reason: 'El archivo pasa los 25 MB.' });
  expect(sharedDraft({ text: '  ', webUrl: null, files: [] })).toBeNull();
});
