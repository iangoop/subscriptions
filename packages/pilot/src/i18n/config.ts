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
            editPageTitle: 'Product',
            listPageTitle: 'Products',
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
          customer: {
            instance: 'Customer',
            editPageTitle: 'Customer',
            listPageTitle: 'Customers',
            emailLbl: 'Email',
            emailPlaceholder: 'Enter email',
            firstNameLbl: 'First name',
            firstNamePlaceholder: 'Enter first name',
            lastNameLbl: 'Last name',
            lastNamePlaceholder: 'Enter last name',
            phoneLbl: 'Phone',
            phoneLblPlaceholder: 'Enter phone number',
            companyLbl: 'Company',
            companyLblPlaceholder: 'Enter company name',
            street1Lbl: 'Street line 1',
            street1LblPlaceholder: 'Enter street line 1',
            street2Lbl: 'Street line 2',
            street2LblPlaceholder: 'Enter street line 2',
            street3Lbl: 'Street line 3',
            street3LblPlaceholder: 'Enter street line 3',
            cityLbl: 'City',
            cityLblPlaceholder: 'Enter city',
            regionLbl: 'Region',
            regionLblPlaceholder: 'Enter region',
            postcodeLbl: 'Post code',
            postcodeLblPlaceholder: 'Enter post code',
            defaultLbl: 'Default address',
            defaultBillingLbl: 'Default billing address',
            defaultShippingLbl: 'Default shipping address',
            addressDetail: {
              instance: 'Address',
              title: 'Adresses',
              title_edit: 'Edit address',
              customerName: 'Customer name',
              customerPhone: 'Customer phone',
              addressCompany: 'Company',
              addressText: 'Address',
              addressPostcode: 'Postcode',
              default: 'Default',
              defaultBilling: 'Default billing',
              defaultShipping: 'Default shipping',
              confirmationModalMessage: 'Address data was successfully saved. ',
            },
            confirmationModalMessage: 'Customer data was successfully saved. ',
          },
          general: {
            submit: 'Submit',
            submiting: 'Sending...',
            remove: 'Remove',
            removing: 'Removing...',
            archive: 'Archive',
            archiving: 'Archiving...',
            unarchive: 'Unarchive',
            unarchiving: 'Unarchiving...',
            edit: 'Edit',
            required: 'This field is required',
            confirmationTitle: 'Success! Your Work is Saved',
            confirmationNext: 'Click close to continue...',
            close: 'Close',
            currency: '£',
            loading: 'Loading...',
            loadMore: 'Show more results',
            addNew: 'Add',
            apiError: 'There was an error processing your request, try again',
            apiSucess: 'Your request has been processed',
            archived: 'Archived',
          },
        },
      },
    },
  });
