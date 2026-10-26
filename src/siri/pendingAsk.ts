// T40: «Oye Siri, preguntale a Lumi» leaves {text, at} in the App Group (native/AskLumiIntent.swift) and opens the
// app, which sends it to Lumi's chat. Something older than a few minutes was not this request: it is dropped.
const FRESH_MS = 10 * 60e3, MAX = 4000;
export function takeAsk(raw: string | null, now: number): string | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { text?: unknown; at?: unknown };
    const at = typeof v.at === 'string' ? Date.parse(v.at) : NaN, text = typeof v.text === 'string' ? v.text.trim().slice(0, MAX) : '';
    return text && Number.isFinite(at) && now - at < FRESH_MS && at - now < 60e3 ? text : null;
  } catch { return null; }
}
