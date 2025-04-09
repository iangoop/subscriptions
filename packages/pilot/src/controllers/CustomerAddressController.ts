import { CustomerAddress, CustomerAddressSchema } from '@mytypes/model';
import {
  ListDataState,
  listStateManagement,
  objectFormStateManagement,
  ObjectFormStateManagementFunctions,
  Props,
} from './CommonController';
import { useParams } from 'react-router-dom';
import { ById } from '@mytypes/crud';

type ByAddressId = {
  addressId: string;
};
interface CustomerAddressController
  extends ObjectFormStateManagementFunctions<CustomerAddress> {
  listState: ListDataState<CustomerAddress>;
}
function useCustomerAddressController(props: Props): CustomerAddressController {
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
    CustomerAddressSchema,
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
      isActive: true,
    },
    'customer-addresses',
    useListStaste.state.data,
    { customerId: customerId },
    () => {
      return '/customers/' + customerId;
    },
    (objectId) => {
      return '/customers/' + customerId + '/address/' + objectId;
    },
    () => {
      useListStaste.invalidate();
    },
  );

  return Object.assign(
    {
      listState: useListStaste.state,
    },
    useFormState,
  );
}

export default useCustomerAddressController;
