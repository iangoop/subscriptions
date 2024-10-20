// src/i18n/config.ts

// Core i18next library.
import i18n from 'i18next';
// Bindings for React: allow components to
// re-render when language changes.
import { initReactI18next } from 'react-i18next';

export default i18n
  // Add React bindings as a plugin.
  .use(initReactI18next)
  // Initialize the i18next instance.
  .init({
    // Config options

    // Specifies the default language (locale) used
    // when a user visits our site for the first time.
    // We use English here, but feel free to use
    // whichever locale you want.
    lng: 'en',

    // Fallback locale used when a translation is
    // missing in the active locale. Again, use your
    // preferred locale here.
    fallbackLng: 'en',

    // Enables useful output in the browser’s
    // dev console.
    debug: true,

    // Normally, we want `escapeValue: true` as it
    // ensures that i18next escapes any code in
    // translation messages, safeguarding against
    // XSS (cross-site scripting) attacks. However,
    // React does this escaping itself, so we turn
    // it off in i18next.
    interpolation: {
      escapeValue: false,
    },

    // Translation messages. Add any languages
    // you want here.
    resources: {
      // English
      en: {
        // `translation` is the default namespace.
        // More details about namespaces shortly.
        translation: {
          product: {
            instance: 'Product',
            productPageTitle: 'Product',
            productListPageTitle: 'Products',
            thumbnailUrlLbl: 'Product Thumbnail',
            thumbnailUrlPlaceholder: 'Enter thumbnail URL of the product',
            nameLbl: 'Product Name',
            namePlaceholder: 'Enter name of product',
            skuLbl: 'Product SKU',
            skuPlaceholder: 'Enter sku of product',
            shortDescriptionLbl: 'Short Description',
            shortDescriptionPlaceholder: 'Enter short description of product',
            longDescriptionLbl: 'Long Description',
            longDescriptionPlaceholder: 'Enter long description of product',
            priceLbl: 'Price',
            pricePlaceholder: 'Enter price of the product',
            qtyInStockLbl: 'Stock Qty',
            qtyInStockPlaceholder: 'Enter qty in stock of the product',
            confirmationModalMessage: 'Product data was successfully saved. ',
            inStock: 'In Stock',
            notInStock: 'Not in Stock',
          },
          general: {
            submit: 'Submit',
            submiting: 'Sending...',
            required: 'This field is required',
            confirmationTitle: 'Success! Your Work is Saved',
            confirmationNext: 'Click close to continue...',
            close: 'Close',
            currency: '£',
            loading: 'Loading...',
            loadMore: 'Show more results',
            addNew: 'Add',
          },
        },
      },
    },
  });
