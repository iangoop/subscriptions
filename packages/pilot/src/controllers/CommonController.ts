import React, { useEffect } from 'react';
import axios from 'axios';
import EnvVars from 'src/util/EnvVars';
import { FormikHelpers } from 'formik';
import { CREATE } from '@mytypes/crud';
import { Empty } from '@mytypes/util';
import { BaseObject, PaginationQuery } from '@mytypes/model';
import { getListWithNoDuplicates } from 'src/util/Pagination';
import { useNavigate } from 'react-router-dom';

export interface Props {}

export interface CommonState {
  isLoading: boolean;
}

export interface FormState extends CommonState {
  isSubmiting: boolean;
}

export interface FormDataState<T> extends FormState {
  data: T;
  showConfirmation: boolean;
  showError: boolean;
}

export interface FormStateManagementFunctions<T> {
  state: FormDataState<T>;
  onSubmit: (values: T, formikHelpers: FormikHelpers<T>) => Promise<void>;
  handleConfirmationClose: () => void;
  handleConfirmationShow: () => void;
}

export class ObjectManagement<T> {
  url: string;
  constructor(url: string) {
    this.url = url;
  }

  async fetch(key: string): Promise<T> {
    const response = await axios.get<T>(
      EnvVars.apiUrl + '/' + this.url + '/' + key,
      {
        withCredentials: false,
      },
    );
    return response.data;
  }

  async fetchAll(
    pageItemsQty: number,
    cursor?: string,
    customParams?: Record<string, string>,
  ): Promise<PaginationQuery<T>> {
    const response = await axios.get<PaginationQuery<T>>(
      EnvVars.apiUrl + '/' + this.url + '/',
      {
        params: Object.assign(
          {
            cursor: cursor,
            limit: pageItemsQty,
          },
          customParams,
        ),
        withCredentials: false,
      },
    );
    return response.data;
  }

  async patch(key: string, data: T, queryParams?: object): Promise<T> {
    const response = await axios.patch<T>(
      EnvVars.apiUrl + '/' + this.url + '/' + key,
      data,
      {
        params: queryParams,
        withCredentials: false,
      },
    );
    return response.data;
  }

  async create(data: T, queryParams?: object): Promise<T> {
    const response = await axios.post<T>(
      EnvVars.apiUrl + '/' + this.url + '/',
      data,
      {
        params: queryParams,
        withCredentials: false,
      },
    );
    return response.data;
  }
}

export function formStateManagement<T>(
  objectId: string | undefined,
  initialState: T,
  serviceUrl: string,
): FormStateManagementFunctions<T> {
  const objectManagement = new ObjectManagement<T>(serviceUrl);
  const [state, setState] = React.useState<FormDataState<T>>({
    isLoading: false,
    isSubmiting: false,
    showConfirmation: false,
    showError: false,
    data: initialState,
  });

  async function onSubmit(values: T, { resetForm }: FormikHelpers<T>) {
    setState((state) => ({ ...state, isSubmiting: true }));
    try {
      if (objectId && objectId !== CREATE) {
        const data: T = await objectManagement.patch(objectId, values);
        setState((state) => ({
          ...state,
          data: data,
          isSubmiting: false,
          showConfirmation: true,
        }));
      } else {
        const data = await objectManagement.create(values);
        setState((state) => ({
          ...state,
          data: data,
          isSubmiting: false,
          showConfirmation: true,
        }));
      }
    } catch (error) {
      setState((state) => ({
        ...state,
        isSubmiting: false,
        showConfirmation: false,
        showError: true,
      }));
      setTimeout(() => {
        setState((state) => ({
          ...state,
          showError: false,
        }));
      }, 5000);
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
    if (objectId && objectId !== CREATE) {
      objectManagement
        .fetch(objectId)
        .then((data) => {
          setState((state) => ({
            ...state,
            isLoading: false,
            data: data,
          }));
        })
        .catch((error) => {});
    } else {
      setState((state) => ({
        ...state,
        isLoading: false,
      }));
    }
  }, [objectId]);

  return {
    state: state,
    onSubmit: onSubmit,
    handleConfirmationClose: handleConfirmationClose,
    handleConfirmationShow: handleConfirmationShow,
  };
}

export interface ObjectFormDataState<T> extends FormDataState<T> {
  isPaneOpen: boolean;
}

export interface ObjectFormStateManagementFunctions<T>
  extends FormStateManagementFunctions<T> {
  state: ObjectFormDataState<T>;
  onOpenPane: (data: T) => void;
  onClosePane: () => void;
}

export function objectFormStateManagement<T extends BaseObject>(
  objectId: string | undefined,
  initialState: T,
  serviceUrl: string,
  objectCollectionReference: (T | Empty)[],
  additionalQueryParam: object,
  navigateFrom: () => string,
  navigateTo: (data: T) => string,
): ObjectFormStateManagementFunctions<T> {
  const navigate = useNavigate();
  const objectManagement = new ObjectManagement<T>(serviceUrl);
  const [state, setState] = React.useState<ObjectFormDataState<T>>({
    isLoading: false,
    isSubmiting: false,
    isPaneOpen: false,
    showConfirmation: false,
    showError: false,
    data: initialState,
  });

  async function onSubmit(values: T, { resetForm }: FormikHelpers<T>) {
    setState((state) => ({ ...state, isSubmiting: true }));
    try {
      if (objectId && objectId !== CREATE) {
        const data: T = await objectManagement.patch(
          objectId,
          values,
          additionalQueryParam,
        );
        setState((state) => ({
          ...state,
          data: data,
          isSubmiting: false,
          showConfirmation: true,
        }));
      } else {
        const data = await objectManagement.create(
          values,
          additionalQueryParam,
        );
        setState((state) => ({
          ...state,
          data: data,
          isSubmiting: false,
          showConfirmation: true,
        }));
      }
    } catch (error) {
      setState((state) => ({
        ...state,
        isSubmiting: false,
        showConfirmation: false,
        showError: true,
      }));
      setTimeout(() => {
        setState((state) => ({
          ...state,
          showError: false,
        }));
      }, 5000);
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

  function onOpenPane(data: T) {
    navigate(navigateTo(data));
  }

  function onClosePane() {
    navigate(navigateFrom());
  }

  useEffect(() => {
    if (objectId) {
      const data = objectCollectionReference
        .filter((objectRef) => {
          return objectRef.id == objectId;
        })
        .shift();
      if (data) {
        setState((state) => ({
          ...state,
          isPaneOpen: true,
          data: data,
        }));
      }
    } else {
      setState((state) => ({
        ...state,
        isPaneOpen: false,
        data: initialState,
      }));
    }
  }, [objectId, objectCollectionReference]);

  return {
    state: state,
    onSubmit: onSubmit,
    handleConfirmationClose: handleConfirmationClose,
    handleConfirmationShow: handleConfirmationShow,
    onOpenPane: onOpenPane,
    onClosePane: onClosePane,
  };
}

export interface ListDataState<T> extends CommonState {
  data: (T | Empty)[];
  cursor?: string;
  hasMore: boolean;
}

export interface ListStateManagementFunctions<T> {
  state: ListDataState<T>;
  fetchItems: () => void;
}

export function listStateManagement<T extends BaseObject>(
  serviceUrl: string,
  pageItemsQty = 32,
  customFetchParams?: Record<string, string>,
): ListStateManagementFunctions<T> {
  const objectManagement = new ObjectManagement<T>(serviceUrl);
  const [state, setState] = React.useState<ListDataState<T>>({
    isLoading: false,
    data: Array<Empty>(pageItemsQty).fill({}),
    cursor: undefined,
    hasMore: true,
  });

  function cleanSkeleton() {
    if (state.data && state.data.length && !state.data[0].id) {
      state.data.splice(0, pageItemsQty);
    }
  }

  async function fetchItems() {
    setState((state) => ({ ...state, isLoading: true }));
    try {
      const response = await objectManagement.fetchAll(
        pageItemsQty,
        state.cursor,
        customFetchParams,
      );
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
