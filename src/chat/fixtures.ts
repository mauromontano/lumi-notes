import { Message, Topic } from './types';
export const FINANCE = '10000000-0000-4000-8000-000000000001';
export const SHOPPING = '10000000-0000-4000-8000-000000000002';
export const topics: Topic[] = [
  { id: FINANCE, title: 'Finanzas', enabled: true, unreadCount: 1 },
  { id: SHOPPING, title: 'Compras y ofertas', enabled: false, unreadCount: 0 },
];
export const fixtures: Message[] = [{
  id: '20000000-0000-4000-8000-000000000001', topicId: FINANCE, createdAt: '2026-10-16T12:00:00.000Z', updatedAt: '2026-10-16T12:00:00.000Z', revision: 1,
  origin: 'job', kind: 'event', status: 'completed', text: 'Ejemplo simulado: tu reporte está disponible. No contiene tus finanzas reales.', reportRefs: ['30000000-0000-4000-8000-000000000001'],
}, {
  id: '20000000-0000-4000-8000-000000000002', topicId: FINANCE, createdAt: '2026-10-16T12:01:00.000Z', updatedAt: '2026-10-16T12:01:00.000Z', revision: 2,
  origin: 'user', kind: 'audio', status: 'completed', attachment: { id: '40000000-0000-4000-8000-000000000001', fileName: 'ejemplo.m4a', mimeType: 'audio/mp4', sizeBytes: 32000, durationMs: 4200, availability: 'expired', expiresAt: '2026-10-15T12:00:00.000Z', transcript: 'Ejemplo: quiero revisar mis gastos del mes.', transcriptionStatus: 'completed' },
}];
