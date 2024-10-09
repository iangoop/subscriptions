export function formatCurrency(num: number) {
  return Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'GBP',
  }).format(num);
}

export const imagePlaceholder = 'https://placehold.co/300x300';
