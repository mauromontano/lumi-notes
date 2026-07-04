export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  reminderAt: string | null;       // ISO 8601
  reminderRecurrence: Recurrence;
  notificationId: string | null;
  tag: string | null;
  secure: boolean;
  createdAt: string;
  updatedAt: string;
}
