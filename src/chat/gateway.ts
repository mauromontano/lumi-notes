import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { MockChatGateway } from './MockChatGateway';
import { HttpChatGateway } from './HttpChatGateway';
import { apiUrl, chatMode } from './config';
import { session } from './session';
import { validateFile, type ChatGateway } from './types';
export const gateway: ChatGateway = chatMode === 'mock' ? new MockChatGateway(undefined, uri => new File(uri).size) : new HttpChatGateway(apiUrl, session.load, fetch, (input, name) => {
  const file = new File(input.localUri);
  validateFile(input.mimeType, file.size, 'durationMs' in input ? input.durationMs : undefined);
  const form = new FormData();
  form.append('clientUploadId', input.clientMessageId);
  form.append('file', file, name);
  return form;
}, __DEV__ && process.env.EXPO_PUBLIC_ALLOW_LOCAL_HTTP === 'true');
