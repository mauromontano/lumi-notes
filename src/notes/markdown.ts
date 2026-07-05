// Formateo de notas con markdown liviano guardado en texto plano (columna `body`).
// Soporta: títulos (`## `), viñetas (`- `) y checklists (`- [ ] ` / `- [x] `).
// Todo son funciones puras para poder testearlas sin RN.

export type FormatAction = 'heading' | 'bullet' | 'task';
export type BlockKind = 'heading' | 'bullet' | 'task' | 'text';

const TASK_RE = /^-\s+\[([ xX])\]\s?(.*)$/;
const BULLET_RE = /^-\s+(.*)$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;

export function classifyLine(line: string): { kind: BlockKind; checked: boolean } {
  const t = line.match(TASK_RE);
  if (t) return { kind: 'task', checked: t[1].toLowerCase() === 'x' };
  if (BULLET_RE.test(line)) return { kind: 'bullet', checked: false };
  if (HEADING_RE.test(line)) return { kind: 'heading', checked: false };
  return { kind: 'text', checked: false };
}

// Devuelve el texto de la línea sin ningún marcador de formato.
export function stripMarkers(line: string): string {
  const t = line.match(TASK_RE);
  if (t) return t[2];
  const b = line.match(BULLET_RE);
  if (b) return b[1];
  const h = line.match(HEADING_RE);
  if (h) return h[2];
  return line;
}

// Aplica/quita el formato en la línea donde está el cursor.
// - heading/bullet: alterna el marcador.
// - task: si no es tarea la convierte en `- [ ] `; si ya lo es, alterna tildado.
export function toggleLine(
  text: string,
  cursor: number,
  action: FormatAction,
): { text: string; cursor: number } {
  const start = text.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
  let end = text.indexOf('\n', cursor);
  if (end === -1) end = text.length;
  const line = text.slice(start, end);
  const cls = classifyLine(line);
  const bare = stripMarkers(line);

  let next: string;
  if (action === 'heading') {
    next = cls.kind === 'heading' ? bare : `## ${bare}`;
  } else if (action === 'bullet') {
    next = cls.kind === 'bullet' ? bare : `- ${bare}`;
  } else {
    next = cls.kind === 'task' ? `- [${cls.checked ? ' ' : 'x'}] ${bare}` : `- [ ] ${bare}`;
  }

  const newText = text.slice(0, start) + next + text.slice(end);
  const newCursor = Math.max(start, cursor + (next.length - line.length));
  return { text: newText, cursor: newCursor };
}

// Alterna el tildado de la tarea en la línea `index` (para tocar el checkbox en modo Vista).
export function toggleTaskByIndex(body: string, index: number): string {
  const lines = body.split('\n');
  if (index < 0 || index >= lines.length) return body;
  const offset = lines.slice(0, index).reduce((acc, l) => acc + l.length + 1, 0);
  return toggleLine(body, offset, 'task').text;
}

// Texto “renderizado” para el preview de la card (una nota puede ser multilínea).
export function previewText(body: string): string {
  return body
    .split('\n')
    .map((l) => {
      const c = classifyLine(l);
      if (c.kind === 'task') return `${c.checked ? '☑' : '☐'} ${stripMarkers(l)}`;
      if (c.kind === 'bullet') return `• ${stripMarkers(l)}`;
      if (c.kind === 'heading') return stripMarkers(l);
      return l;
    })
    .join('\n')
    .trim();
}
