import { classifyLine, stripMarkers, toggleLine, previewText } from '../markdown';

describe('markdown · classifyLine', () => {
  it('reconoce cada tipo de línea', () => {
    expect(classifyLine('## Título').kind).toBe('heading');
    expect(classifyLine('- item').kind).toBe('bullet');
    expect(classifyLine('- [ ] tarea')).toEqual({ kind: 'task', checked: false });
    expect(classifyLine('- [x] hecha')).toEqual({ kind: 'task', checked: true });
    expect(classifyLine('texto normal').kind).toBe('text');
  });
});

describe('markdown · stripMarkers', () => {
  it('quita el marcador y deja el texto', () => {
    expect(stripMarkers('## Título')).toBe('Título');
    expect(stripMarkers('- item')).toBe('item');
    expect(stripMarkers('- [x] hecha')).toBe('hecha');
    expect(stripMarkers('sin marcador')).toBe('sin marcador');
  });
});

describe('markdown · toggleLine', () => {
  it('agrega y quita viñeta en la línea del cursor', () => {
    const added = toggleLine('leche', 2, 'bullet');
    expect(added.text).toBe('- leche');
    const removed = toggleLine(added.text, 2, 'bullet');
    expect(removed.text).toBe('leche');
  });

  it('convierte a tarea y alterna el tildado', () => {
    const asTask = toggleLine('comprar', 0, 'task');
    expect(asTask.text).toBe('- [ ] comprar');
    const checked = toggleLine(asTask.text, 0, 'task');
    expect(checked.text).toBe('- [x] comprar');
    const unchecked = toggleLine(checked.text, 0, 'task');
    expect(unchecked.text).toBe('- [ ] comprar');
  });

  it('opera solo sobre la línea del cursor en texto multilínea', () => {
    const text = 'uno\ndos\ntres';
    const cursor = text.indexOf('dos') + 1;
    const out = toggleLine(text, cursor, 'heading');
    expect(out.text).toBe('uno\n## dos\ntres');
  });
});

describe('markdown · previewText', () => {
  it('renderiza marcadores para el preview de la card', () => {
    const body = '## Compras\n- leche\n- [ ] pan\n- [x] café';
    expect(previewText(body)).toBe('Compras\n• leche\n☐ pan\n☑ café');
  });
});
