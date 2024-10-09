import React, { useEffect } from 'react';
import { CommonState } from './CommonController';
import { Product, ProductSchema } from '@mytypes/model';
import axios from 'axios';
import EnvVars from 'src/util/EnvVars';
import { useParams } from 'react-router-dom';
import { ById, CREATE } from '@mytypes/crud';
import { FormikHelpers } from 'formik';
import { ObjectSchema } from 'yup';

export interface Props {}
interface State extends CommonState {
  data: Product;
  showConfirmation: boolean;
}
interface Controller {
  state: State;
  validationSchema: ObjectSchema<Product>;
  onSubmit: (
    values: Product,
    formikHelpers: FormikHelpers<Product>,
  ) => Promise<void>;
  handleConfirmationClose: () => void;
  handleConfirmationShow: () => void;
}

function useProductController(props: Props): Controller {
  const [state, setState] = React.useState<State>({
    isLoading: false,
    showConfirmation: false,
    data: {
      id: '',
      name: '',
      sku: '',
      longDescription: '',
      price: 0,
      qtyInStock: 0,
      shortDescription: '',
      thumbnailUrl: '',
    },
  });
  const { id } = useParams<ById>();
  async function fetchProduct(key: String): Promise<Product> {
    const response = await axios.get<Product>(
      EnvVars.apiUrl + '/products/' + key,
      {
        withCredentials: false,
      },
    );
    return response.data;
  }

  async function patchProduct(key: String, product: Product) {
    const response = await axios.patch<Product>(
      EnvVars.apiUrl + '/products/' + key,
      product,
      {
        withCredentials: false,
      },
    );
    return response.data;
  }

  async function createProduct(product: Product) {
    const response = await axios.post<Product>(
      EnvVars.apiUrl + '/products/',
      product,
      {
        withCredentials: false,
      },
    );
    return response.data;
  }

  async function onSubmit(
    values: Product,
    { resetForm }: FormikHelpers<Product>,
  ) {
    if (id && id !== CREATE) {
      const data = await patchProduct(id, values);
      setState((state) => ({
        ...state,
        data: data,
        showConfirmation: true,
      }));
    } else {
      const data = await createProduct(values);
      setState((state) => ({
        ...state,
        data: data,
        showConfirmation: true,
      }));
    }
  }

  function handleConfirmationClose() {
    setState((state) => ({
      ...state,
      showConfirmation: false,
    }));
  }

  function handleConfirmationShow() {
    setState((state) => ({
      ...state,
      showConfirmation: true,
    }));
  }

  useEffect(() => {
    setState((state) => ({ ...state, isLoading: true }));
    if (id && id !== CREATE) {
      fetchProduct(id)
        .then((data) => {
          setState((state) => ({
            ...state,
            isLoading: false,
            data: data,
          }));
        })
        .catch((error) => {
          console.log(error);
        });
    }
  }, [id]);

  return {
    state: state,
    validationSchema: ProductSchema,
    onSubmit: onSubmit,
    handleConfirmationClose: handleConfirmationClose,
    handleConfirmationShow: handleConfirmationShow,
  };
}

export default useProductController;
