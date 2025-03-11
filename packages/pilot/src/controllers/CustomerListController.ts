import {
  listStateManagement,
  ListStateManagementFunctions,
  Props,
} from './CommonController';
import { Customer } from '@mytypes/model';

function useCustomerListController(
  props: Props,
): ListStateManagementFunctions<Customer> {
  return listStateManagement<Customer>('customers');
}

export default useCustomerListController;
