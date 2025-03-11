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
