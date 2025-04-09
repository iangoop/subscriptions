import { Product } from '@mytypes/model';
import {
  listStateManagement,
  ListStateManagementFunctions,
  Props,
} from './CommonController';

function useProductListController(
  props: Props,
): ListStateManagementFunctions<Product> {
  return listStateManagement<Product>('products');
}

export default useProductListController;
