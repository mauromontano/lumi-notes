import { appGroup } from '@/native/appGroup';
import type { ChatGateway } from '@/chat/types';
import { widgetSnapshot } from './snapshot';
// The widget never calls the server: the app writes what it should show whenever it comes to the front or leaves it.
export async function syncWidget(gateway: Pick<ChatGateway, 'today'>, now = new Date()) {
  try {
    appGroup.set('widget', JSON.stringify(widgetSnapshot(await gateway.today(), now)));
    appGroup.reloadWidget();
  } catch {}
}
