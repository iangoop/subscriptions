import { ICustomer, CustomerCollection } from '@src/models/Customer';
import { customerConverter } from './converters/CustomerConverter';
import { Crud } from '@src/helpers/dbfunctions';
import { customerValidator } from './validators/CustomerValidator';

class CustomerCrud extends Crud<ICustomer> {
  constructor() {
    super(CustomerCollection, customerConverter, customerValidator);
  }
}

export const customerService = (): CustomerCrud => {
  return new CustomerCrud();
};
