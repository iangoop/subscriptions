import {
  InputAttributes,
  NumberFormatBase,
  NumberFormatBaseProps,
} from 'react-number-format';

function MyCustomNumberFormat(props: NumberFormatBaseProps<InputAttributes>) {
  const format = (numStr: string) => {
    if (numStr === '') return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GBP',
      currencyDisplay: 'code',
    }).format(Number(numStr));
  };

  return <NumberFormatBase {...props} format={format} />;
}

export default MyCustomNumberFormat;
