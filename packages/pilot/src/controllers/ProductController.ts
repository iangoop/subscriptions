import {
  formStateManagement,
  FormStateManagementFunctions,
  Props,
} from './CommonController';
import { Product, ProductSchema } from '@mytypes/model';
import { useParams } from 'react-router-dom';
import { ById } from '@mytypes/crud';

function useProductController(
  props: Props,
): FormStateManagementFunctions<Product> {
  const { id } = useParams<ById>();
  const useFormState = formStateManagement<Product>(
    ProductSchema,
    id,
    {
      id: '',
      name: '',
      sku: '',
      longDescription: '',
      price: 0,
      qtyInStock: 0,
      shortDescription: '',
      thumbnailUrl: '',
    },
    'products',
  );
  return useFormState;
}

export default useProductController;
