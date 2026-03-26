import { CustomerAddress } from '@mytypes/model';
import { format, parseISO } from 'date-fns';

export function formatCurrency(num: number) {
  return Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'GBP',
  }).format(num);
}
export function sanitizeNames(firstName: string, lastName: string) {
  const sanitizedFirstName = encodeURIComponent(firstName.split(' ')[0]);
  const sanitizedLastName = encodeURIComponent(lastName.split(' ')[0]);

  return sanitizedLastName.length
    ? `${sanitizedFirstName}+${sanitizedLastName}`
    : sanitizedLastName;
}
export function formatAddress(address: CustomerAddress) {
  let formattedAddress = address.street1;
  if (address.street2) {
    formattedAddress = formattedAddress.concat(` ${address.street2}`);
  }
  if (address.street3) {
    formattedAddress = formattedAddress.concat(` ${address.street3}`);
  }
  formattedAddress = formattedAddress.concat(` - ${address.postcode}`);
  return formattedAddress;
}

export function formatDate(date?: string) {
  return date ? format(parseISO(date), 'd MMMM') : '';
}

export function decodeSchedule(schedule: string) {
  const match = schedule.match(/^(\d+)([MW])$/);
  if (!match) {
    return null;
  }
  const period = parseInt(match[1], 10);
  const type = match[2];
  return { period, type };
}
