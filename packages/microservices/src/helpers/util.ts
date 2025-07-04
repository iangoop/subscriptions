import { format, formatISO, parse } from 'date-fns';
import util from 'util';
import { ApiError, createError, InternalErrorList } from './errors';

export function getFormattedTime() {
  return formatISO(new Date());
}

export function dateToString(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export function parseDate(dateString: string) {
  return parse(dateString, 'yyyy-MM-dd', new Date());
}

export function extractNumber(value: string) {
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : NaN;
}

export async function fetchJson<T>(url: string, param: object): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(param),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new ApiError(
      createError(
        'fn001',
        util.format(InternalErrorList.fn001, res.url, JSON.stringify(error)),
      ),
    );
  }
  return res.json() as Promise<T>;
}
