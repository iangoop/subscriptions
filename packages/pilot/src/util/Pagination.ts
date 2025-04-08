import { BaseObject } from '@mytypes/model';

export function getListWithNoDuplicates<T extends BaseObject>(
  list: T[],
  toAdd: T[],
): T[] {
  return list
    .filter(
      (itemList) => !toAdd.some((itemToAdd) => itemList.id === itemToAdd.id),
    )
    .concat(toAdd);
}
