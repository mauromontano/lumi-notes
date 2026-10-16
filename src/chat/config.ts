import { serverUrl } from './HttpChatGateway';
export const chatMode = process.env.EXPO_PUBLIC_CHAT_MODE ?? 'mock';
if (!['mock', 'http'].includes(chatMode)) throw new Error('EXPO_PUBLIC_CHAT_MODE debe ser mock o http.');
export const apiUrl = chatMode === 'http' ? serverUrl(process.env.EXPO_PUBLIC_LUMI_API_URL ?? '', __DEV__ && process.env.EXPO_PUBLIC_ALLOW_LOCAL_HTTP === 'true') : '';
export const sessionKey = chatMode === 'mock' ? 'lumi.device.mock.v1' : 'lumi.device.http.v1.' + Array.from(apiUrl).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
