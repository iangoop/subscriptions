import { Customer, CustomerSchema } from '@mytypes/model';
import {
  formStateManagement,
  FormStateManagementFunctions,
  Props,
} from './CommonController';
import { ObjectSchema } from 'yup';
import { useParams } from 'react-router-dom';
import { ById } from '@mytypes/crud';

export interface CustomerController
  extends FormStateManagementFunctions<Customer> {
  validationSchema: ObjectSchema<Customer>;
}
function useCustomerController(props: Props): CustomerController {
  const { id } = useParams<ById>();
  const useFormState = formStateManagement<Customer>(
    id,
    {
      id: '',
      firstName: '',
      lastName: '',
      email: '',
    },
    'customers',
  );

  return Object.assign({ validationSchema: CustomerSchema }, useFormState);
}

export default useCustomerController;
