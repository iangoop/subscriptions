import { Customer, CustomerSchema } from '@mytypes/model';
import {
  formStateManagement,
  FormStateManagementFunctions,
  Props,
} from './CommonController';
import { useParams } from 'react-router-dom';
import { ById } from '@mytypes/crud';

function useCustomerController(
  props: Props,
): FormStateManagementFunctions<Customer> {
  const { id } = useParams<ById>();
  const useFormState = formStateManagement<Customer>(
    CustomerSchema,
    id,
    {
      id: '',
      firstName: '',
      lastName: '',
      email: '',
    },
    'customers',
  );

  return useFormState;
}

export default useCustomerController;
