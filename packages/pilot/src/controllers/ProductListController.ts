import React, { useEffect } from 'react';
import { CommonState } from './CommonController';
import { PaginationQuery, Product } from '@mytypes/model';
import axios from 'axios';
import EnvVars from 'src/util/EnvVars';
import { getListWithNoDuplicates } from 'src/util/Pagination';
import { Empty } from '@mytypes/util';

export interface Props {}
interface State extends CommonState {
  data: (Product | Empty)[];
  cursor?: string;
  hasMore: boolean;
}
interface Controller {
  state: State;
  fetchItems: () => void;
}
function useProductListController(props: Props): Controller {
  const pageItemsQty = 32;
  const [state, setState] = React.useState<State>({
    isLoading: false,
    invalidate: true,
    data: Array<Empty>(pageItemsQty).fill({}),
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
          limit: pageItemsQty,
        },
        withCredentials: false,
      },
    );
    return response.data;
  }

  function cleanSkeleton() {
    if (state.data && state.data.length && !state.data[0].id) {
      state.data.splice(0, pageItemsQty);
    }
  }

  async function fetchItems() {
    setState((state) => ({ ...state, isLoading: true }));
    try {
      const response = await fetchProducts(state.cursor);
      cleanSkeleton();
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
