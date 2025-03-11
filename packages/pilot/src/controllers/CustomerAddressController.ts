import { CustomerAddress, CustomerAddressSchema } from '@mytypes/model';
import {
  ListDataState,
  listStateManagement,
  objectFormStateManagement,
  ObjectFormStateManagementFunctions,
  Props,
} from './CommonController';
import { ObjectSchema } from 'yup';
import { useParams } from 'react-router-dom';
import { ById } from '@mytypes/crud';

type ByAddressId = {
  addressId: string;
};
interface Controller
  extends ObjectFormStateManagementFunctions<CustomerAddress> {
  listState: ListDataState<CustomerAddress>;
  validationSchema: ObjectSchema<CustomerAddress>;
}
function useCustomerAddressController(props: Props): Controller {
  const pageItemsQty = 12;
  const { id: customerId, addressId } = useParams<ById & ByAddressId>();
  if (!customerId) {
    throw new Error('');
  }
  const useListStaste = listStateManagement<CustomerAddress>(
    'customer-addresses',
    pageItemsQty,
    {
      customerId: customerId,
    },
  );
  const useFormState = objectFormStateManagement<CustomerAddress>(
    addressId,
    {
      id: '',
      firstName: '',
      lastName: '',
      phone: '',
      company: '',
      street1: '',
      street2: '',
      street3: '',
      city: '',
      region: '',
      postcode: '',
      country: '',
      isDefault: false,
      isDefaultBilling: false,
      isDefaultShipping: false,
    },
    'customer-addresses',
    useListStaste.state.data,
    { customerId: customerId },
    () => {
      return '/customers/' + customerId;
    },
    (data) => {
      return '/customers/' + customerId + '/address/' + data.id;
    },
  );

  return Object.assign(
    {
      validationSchema: CustomerAddressSchema,
      listState: useListStaste.state,
    },
    useFormState,
  );
}

export default useCustomerAddressController;
