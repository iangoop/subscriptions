import { functionsUrl } from '@src/configurations/firebase';
import { fetchJson } from '@src/helpers/util';

export async function fetchNextScheduledDate(date: string, schedule: string) {
  const data = await fetchJson<{ nextDate: string }>(
    `${functionsUrl}/next-scheduled-date`,
    { date, schedule },
  );
  return data.nextDate;
}
