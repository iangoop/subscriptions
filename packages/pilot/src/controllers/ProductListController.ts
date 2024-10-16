import React, { useEffect } from 'react';
import { CommonState } from './CommonController';
import { PaginationQuery, Product } from '@mytypes/model';
import axios from 'axios';
import EnvVars from 'src/util/EnvVars';
import { getListWithNoDuplicates } from 'src/util/Pagination';

export interface Props {}
interface State extends CommonState {
  data: Product[];
  cursor?: string;
  hasMore: boolean;
}
interface Controller {
  state: State;
  fetchItems: () => void;
}
function useProductListController(props: Props): Controller {
  const [state, setState] = React.useState<State>({
    isLoading: false,
    data: [],
    cursor: undefined,
    hasMore: true,
  });

  async function fetchProducts(
    cursor?: string,
  ): Promise<PaginationQuery<Product>> {
    const response = await axios.get<PaginationQuery<Product>>(
      EnvVars.apiUrl + '/products',
      {
        params: {
          cursor: cursor,
        },
        withCredentials: false,
      },
    );
    return response.data;
  }

  async function fetchItems() {
    setState((state) => ({ ...state, isLoading: true }));
    try {
      const response = await fetchProducts(state.cursor);
      setState((state) => ({
        ...state,
        isLoading: false,
        data: getListWithNoDuplicates(state.data, response.data),
        cursor: response.next,
        hasMore: response.next ? true : false,
      }));
    } catch (error) {
      setState((state) => ({ ...state, isLoading: false }));
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  return {
    state: state,
    fetchItems: fetchItems,
  };
}

export default useProductListController;
