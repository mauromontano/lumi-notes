import { FormatterError, parseFormatterResponse, type FormattedNote, type NoteFormatter } from './formatter';
import { getApiKey as defaultGetApiKey } from '@/settings/secrets';
import { getAiEnabled } from '@/settings/prefs';
import { log } from '@/lib/log';

const SYSTEM_PROMPT = `Sos Lumi, el asistente de una app de notas. Convertís dictados en notas prolijas en español.
Respondé SOLO con JSON válido, sin texto extra, con esta forma exacta:
{"titulo": "título corto y claro", "cuerpo": "texto de la nota", "tag": "una categoría o null", "recordatorio": {"fecha": "ISO 8601 con offset o null", "recurrencia": "none|daily|weekly|monthly"}}
Reglas:
- Si el dictado enumera cosas, el cuerpo usa bullets markdown: "- item" (uno por línea).
- Corregí puntuación y muletillas, pero NO inventes contenido que no se dictó.
- El título resume la nota en pocas palabras.
- "tag" debe ser exactamente una de: "compras", "trabajo", "ideas", "personal", "salud", "viajes". Si ninguna aplica bien, usá null.
- "recordatorio": si el dictado pide que le recuerden algo ("recordame…", "avisame…", "mañana a las…", "todos los días a las…"), completá "fecha" con la fecha/hora resuelta a partir de "Fecha y hora actual" que te doy, en ISO 8601 con el MISMO offset horario. Si no hay pedido de recordatorio, "fecha" debe ser null.
- "recurrencia": "daily" para "todos los días", "weekly" para "cada semana/todos los lunes", "monthly" para "cada mes"; si es una sola vez, "none".
- Quitá del "cuerpo" la frase del recordatorio (ej: "recordame mañana a las 3"): no debe aparecer en el texto de la nota.`;

interface Deps {
  getApiKey?: () => Promise<string | null>;
  fetchFn?: typeof fetch;
  model?: string;
  timeoutMs?: number;
  now?: () => Date;
}

// ISO 8601 en hora local CON el offset del dispositivo (p.ej. 2026-07-07T15:30:00-03:00).
// Claude necesita el offset para resolver "mañana a las 3" al instante correcto y que
// buildTrigger lea la hora/minuto local esperada.
export function offsetIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const tz = -d.getTimezoneOffset(); // minutos al este de UTC
  const sign = tz >= 0 ? '+' : '-';
  const abs = Math.abs(tz);
  const off = `${sign}${p(Math.floor(abs / 60))}:${p(abs % 60)}`;
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off}`;
}

export function createClaudeFormatter(deps: Deps = {}): NoteFormatter {
  // Sin override de test: la key efectiva es null si el usuario apagó la IA en Ajustes.
  const getKey =
    deps.getApiKey ?? (async () => ((await getAiEnabled()) ? defaultGetApiKey() : null));
  const fetchFn = deps.fetchFn ?? fetch;
  const model = deps.model ?? 'claude-haiku-4-5';
  const timeoutMs = deps.timeoutMs ?? 15000;
  const now = deps.now ?? (() => new Date());

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
        log.warn('llamada a Claude falló:', aborted ? 'timeout' : 'network', '-', (e as Error).message);
        throw new FormatterError(aborted ? 'timeout' : 'network', (e as Error).message);
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) {
        log.warn('llamada a Claude falló: HTTP', res.status);
        throw new FormatterError('api', `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { content: { type: string; text?: string }[] };
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
      return callClaude(
        `Fecha y hora actual: ${offsetIso(now())}\n\nDictado a convertir en nota:\n"""${transcript}"""`,
      );
    },
    editNote(current: FormattedNote, instruction: string) {
      return callClaude(
        `Nota actual:\n{"titulo": ${JSON.stringify(current.title)}, "cuerpo": ${JSON.stringify(current.body)}, "tag": ${JSON.stringify(current.tag)}}\n\nInstrucción del usuario: """${instruction}"""\n\nDevolvé la nota modificada aplicando SOLO lo que pide la instrucción.`,
      );
    },
  };
}
