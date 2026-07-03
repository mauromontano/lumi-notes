import { FormatterError, parseFormatterResponse, type FormattedNote, type NoteFormatter } from './formatter';
import { getApiKey as defaultGetApiKey } from '@/settings/secrets';

const SYSTEM_PROMPT = `Sos Lumi, el asistente de una app de notas. Convertís dictados en notas prolijas en español.
Respondé SOLO con JSON válido, sin texto extra, con esta forma exacta:
{"titulo": "título corto y claro", "cuerpo": "texto de la nota"}
Reglas:
- Si el dictado enumera cosas, el cuerpo usa bullets markdown: "- item" (uno por línea).
- Corregí puntuación y muletillas, pero NO inventes contenido que no se dictó.
- El título resume la nota en pocas palabras.`;

interface Deps {
  getApiKey?: () => Promise<string | null>;
  fetchFn?: typeof fetch;
  model?: string;
  timeoutMs?: number;
}

export function createClaudeFormatter(deps: Deps = {}): NoteFormatter {
  const getKey = deps.getApiKey ?? defaultGetApiKey;
  const fetchFn = deps.fetchFn ?? fetch;
  const model = deps.model ?? 'claude-haiku-4-5';
  const timeoutMs = deps.timeoutMs ?? 15000;

  async function callClaude(userContent: string): Promise<FormattedNote> {
    const key = await getKey();
    if (!key) throw new FormatterError('no-key');

    async function once(): Promise<FormattedNote> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res: Response;
      try {
        res = await fetchFn('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': key!,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userContent }],
          }),
          signal: controller.signal,
        });
      } catch (e) {
        const aborted = (e as Error).name === 'AbortError';
        throw new FormatterError(aborted ? 'timeout' : 'network', (e as Error).message);
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) throw new FormatterError('api', `HTTP ${res.status}`);
      const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
      const text = data.content?.find((c) => c.type === 'text')?.text ?? '';
      return parseFormatterResponse(text);
    }

    try {
      return await once();
    } catch (e) {
      if (e instanceof FormatterError && e.kind === 'parse') return once(); // 1 reintento
      throw e;
    }
  }

  return {
    formatNote(transcript: string) {
      return callClaude(`Dictado a convertir en nota:\n"""${transcript}"""`);
    },
    editNote(current: FormattedNote, instruction: string) {
      return callClaude(
        `Nota actual:\n{"titulo": ${JSON.stringify(current.title)}, "cuerpo": ${JSON.stringify(current.body)}}\n\nInstrucción del usuario: """${instruction}"""\n\nDevolvé la nota modificada aplicando SOLO lo que pide la instrucción.`,
      );
    },
  };
}
