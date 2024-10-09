import { BaseObject } from '@mytypes/model';

export function getListWithNoDuplicates<T extends BaseObject>(
  list: T[],
  toAdd: T[],
): T[] {
  return list.concat(
    toAdd.filter(
      (itemToAdd) => !list.some((itemList) => itemList.id === itemToAdd.id),
    ),
  );
}
