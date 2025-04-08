import { CREATE } from '@mytypes/crud';

export function normalizeObjectId(objectId: string | undefined) {
  return objectId && objectId !== CREATE ? objectId : CREATE;
}

export function timedActions(update: () => void, updateAfter: () => void) {
  update();
  setTimeout(updateAfter, 5000);
}
