import { parseMessage } from '../markdown';

const plain = (text: string) => [{ text }];

test('un texto sin formato queda igual', () => {
  expect(parseMessage('Hola, ¿todo bien?')).toEqual([{ kind: 'paragraph', spans: plain('Hola, ¿todo bien?') }]);
  expect(parseMessage('')).toEqual([]);
});

test('negrita, cursiva y código dejan de mostrar los asteriscos', () => {
  expect(parseMessage('**¿Se abre en el celular?** Desde acá no')[0].spans).toEqual([
    { text: '¿Se abre en el celular?', bold: true }, { text: ' Desde acá no' },
  ]);
  expect(parseMessage('una *idea* y `buenos-aires-2026-11.html`')[0].spans).toEqual([
    { text: 'una ' }, { text: 'idea', italic: true }, { text: ' y ' }, { text: 'buenos-aires-2026-11.html', code: true },
  ]);
  expect(parseMessage('**Hotel: *Rendez Vous***')[0].spans).toEqual([{ text: 'Hotel: ', bold: true }, { text: 'Rendez Vous', bold: true, italic: true }]);
});

test('los marcadores sueltos o dentro de palabras se muestran tal cual', () => {
  expect(parseMessage('2 * 3 = 6 y **sin cerrar')[0].spans).toEqual(plain('2 * 3 = 6 y **sin cerrar'));
  expect(parseMessage('archivo mi_guia_final.html')[0].spans).toEqual(plain('archivo mi_guia_final.html'));
});

test('títulos, viñetas y listas numeradas son bloques propios', () => {
  const blocks = parseMessage('## Pendiente\n- Vuelta del **lunes**\n* Hotel\n1. Comprar\n2) Reservar\n\nFin');
  expect(blocks.map(b => [b.kind, 'marker' in b ? b.marker : undefined])).toEqual([
    ['heading', undefined], ['bullet', undefined], ['bullet', undefined], ['number', '1.'], ['number', '2.'], ['paragraph', undefined],
  ]);
  expect(blocks[1].spans).toEqual([{ text: 'Vuelta del ' }, { text: 'lunes', bold: true }]);
  expect(blocks[0].spans).toEqual(plain('Pendiente'));
});

test('las líneas seguidas forman un párrafo; una línea vacía lo corta', () => {
  expect(parseMessage('uno\ndos\n\ntres')).toEqual([
    { kind: 'paragraph', spans: plain('uno\ndos') }, { kind: 'paragraph', spans: plain('tres') },
  ]);
});

test('un bloque de código se muestra sin interpretar y una línea --- se ignora', () => {
  expect(parseMessage('```\n**no** es negrita\n```\n---\nok')).toEqual([
    { kind: 'code', spans: [{ text: '**no** es negrita', code: true }] }, { kind: 'paragraph', spans: plain('ok') },
  ]);
  expect(parseMessage('```\nsin cerrar')).toEqual([{ kind: 'code', spans: [{ text: 'sin cerrar', code: true }] }]);
});

test('un link con texto muestra el texto; la URL sigue disponible para el botón de abrir', () => {
  expect(parseMessage('mirá [la guía](https://x.ts.net/r/1) acá')[0].spans).toEqual([
    { text: 'mirá ' }, { text: 'la guía', link: 'https://x.ts.net/r/1' }, { text: ' acá' },
  ]);
});

test('una tabla se lee como filas: encabezado en negrita y celdas separadas por un punto', () => {
  expect(parseMessage('| Opción | Precio |\n|---|:---:|\n| Hotel **A** | $100 |\n| Hotel B | $90 |')).toEqual([
    { kind: 'row', spans: [{ text: 'Opción · Precio', bold: true }] },
    { kind: 'row', spans: [{ text: 'Hotel ' }, { text: 'A', bold: true }, { text: ' · $100' }] },
    { kind: 'row', spans: [{ text: 'Hotel B · $90' }] },
  ]);
});
