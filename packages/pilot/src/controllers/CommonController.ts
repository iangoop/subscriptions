import React, { useEffect } from 'react';
import axios from 'axios';
import EnvVars from 'src/util/EnvVars';
import { FormikHelpers } from 'formik';
import { CREATE } from '@mytypes/crud';
import { Empty } from '@mytypes/util';
import { BaseObject, PaginationQuery } from '@mytypes/model';
import { getListWithNoDuplicates } from 'src/util/Pagination';
import { useNavigate } from 'react-router-dom';
import { normalizeObjectId, timedActions } from 'src/util/Common';
import { ObjectSchema } from 'yup';

export interface Props {}

export interface CommonState {
  isLoading: boolean;
  invalidate: boolean;
}

export interface FormState extends CommonState {
  isSubmiting: boolean;
  isProcessingRequest: boolean;
}

export interface FormDataState<T> extends FormState {
  data: T;
  showConfirmation: boolean;
  showError: boolean;
  showSuccess: boolean;
}

export type FormSubmit<T> = (
  values: T,
  formikHelpers: FormikHelpers<T>,
) => Promise<void>;

export interface FormStateManagementFunctions<T extends BaseObject> {
  objectId: () => string;
  state: FormDataState<T>;
  isUpdateOperation: () => boolean;
  onSubmit: FormSubmit<T>;
  onRemove: () => Promise<void>;
  onUnarchive: () => Promise<void>;
  handleConfirmationClose: () => void;
  handleConfirmationShow: () => void;
  validationSchema: ObjectSchema<T>;
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

  async delete(key: string, queryParams?: object) {
    const response = await axios.delete<T>(
      EnvVars.apiUrl + '/' + this.url + '/' + key,
      {
        params: queryParams,
        withCredentials: false,
      },
    );
    return response.data;
  }

  async unarchive(key: string, queryParams?: object) {
    const response = await axios.patch<T>(
      EnvVars.apiUrl + '/' + this.url + '/unarchive/' + key,
      {},
      {
        params: queryParams,
        withCredentials: false,
      },
    );
    return response.data;
  }
}

function utilFormStateManagement(objectId: string | undefined) {
  return {
    objectId: () => {
      return normalizeObjectId(objectId);
    },
    isUpdateOperation: () => {
      return !!objectId && objectId === CREATE;
    },
  };
}

export function formStateManagement<T extends BaseObject>(
  schema: ObjectSchema<T>,
  objectId: string | undefined,
  initialState: T,
  serviceUrl: string,
): FormStateManagementFunctions<T> {
  const util = utilFormStateManagement(objectId);
  const navigate = useNavigate();
  const objectManagement = new ObjectManagement<T>(serviceUrl);
  const [state, setState] = React.useState<FormDataState<T>>({
    isLoading: false,
    invalidate: true,
    isSubmiting: false,
    isProcessingRequest: false,
    showConfirmation: false,
    showError: false,
    showSuccess: false,
    data: initialState,
  });

  async function onSubmit(values: T, { resetForm }: FormikHelpers<T>) {
    setState((state) => ({ ...state, isSubmiting: true }));
    try {
      if (objectId && objectId !== CREATE) {
        const data = await objectManagement.patch(objectId, values);
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
        navigate('../' + data.id);
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

  async function onRemove() {
    if (objectId && objectId !== CREATE) {
      setState((state) => ({ ...state, isProcessingRequest: true }));
      try {
        await objectManagement.delete(objectId);
        timedActions(
          () => {
            setState((state) => ({
              ...state,
              isProcessingRequest: false,
              showSuccess: true,
            }));
          },
          () => {
            setState((state) => ({
              ...state,
              showSuccess: false,
            }));
          },
        );
      } catch (error) {
        timedActions(
          () => {
            setState((state) => ({
              ...state,
              isProcessingRequest: false,
              showError: true,
            }));
          },
          () => {
            setState((state) => ({
              ...state,
              showError: false,
            }));
          },
        );
      }
    }
  }

  async function onUnarchive() {
    if (objectId && objectId !== CREATE) {
      setState((state) => ({ ...state, isProcessingRequest: true }));
      try {
        await objectManagement.unarchive(objectId);
        timedActions(
          () => {
            setState((state) => ({
              ...state,
              isProcessingRequest: false,
              showSuccess: true,
            }));
          },
          () => {
            setState((state) => ({
              ...state,
              showSuccess: false,
            }));
          },
        );
      } catch (error) {
        timedActions(
          () => {
            setState((state) => ({
              ...state,
              isProcessingRequest: false,
              showError: true,
            }));
          },
          () => {
            setState((state) => ({
              ...state,
              showError: false,
            }));
          },
        );
      }
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
        data: initialState,
      }));
    }
  }, [objectId]);

  return Object.assign(util, {
    state: state,
    onSubmit: onSubmit,
    onRemove: onRemove,
    onUnarchive: onUnarchive,
    handleConfirmationClose: handleConfirmationClose,
    handleConfirmationShow: handleConfirmationShow,
    validationSchema: schema,
  });
}

export interface ObjectFormDataState<T> extends FormDataState<T> {
  isPaneOpen: boolean;
}

export interface ObjectFormStateManagementFunctions<T extends BaseObject>
  extends FormStateManagementFunctions<T> {
  state: ObjectFormDataState<T>;
  onOpenPane: (data?: T) => void;
  onClosePane: () => void;
}

export function objectFormStateManagement<T extends BaseObject>(
  schema: ObjectSchema<T>,
  objectId: string | undefined,
  initialState: T,
  serviceUrl: string,
  objectCollectionReference: (T | Empty)[],
  additionalQueryParam: object,
  navigateFrom: () => string,
  navigateTo: (data: string) => string,
  notifyChanges: () => void = () => {},
): ObjectFormStateManagementFunctions<T> {
  const util = utilFormStateManagement(objectId);
  const navigate = useNavigate();
  const objectManagement = new ObjectManagement<T>(serviceUrl);
  const [state, setState] = React.useState<ObjectFormDataState<T>>({
    isLoading: false,
    invalidate: true,
    isSubmiting: false,
    isProcessingRequest: false,
    isPaneOpen: false,
    showConfirmation: false,
    showError: false,
    showSuccess: false,
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
        onClosePane();
        notifyChanges();
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
        onClosePane();
        notifyChanges();
      }
    } catch (error) {
      timedActions(
        () => {
          setState((state) => ({
            ...state,
            isSubmiting: false,
            showConfirmation: false,
            showError: true,
          }));
        },
        () => {
          setState((state) => ({
            ...state,
            showError: false,
          }));
        },
      );
    }
  }

  async function onRemove() {
    if (objectId && objectId !== CREATE) {
      setState((state) => ({ ...state, isProcessingRequest: true }));
      try {
        await objectManagement.delete(objectId, additionalQueryParam);
        timedActions(
          () => {
            setState((state) => ({
              ...state,
              isProcessingRequest: false,
              showSuccess: true,
            }));
            onClosePane();
            notifyChanges();
          },
          () => {
            setState((state) => ({
              ...state,
              showSuccess: false,
            }));
          },
        );
      } catch (error) {
        timedActions(
          () => {
            setState((state) => ({
              ...state,
              isProcessingRequest: false,
              showError: true,
            }));
          },
          () => {
            setState((state) => ({
              ...state,
              showError: false,
            }));
          },
        );
      }
    }
  }

  async function onUnarchive() {
    if (objectId && objectId !== CREATE) {
      setState((state) => ({ ...state, isProcessingRequest: true }));
      try {
        await objectManagement.unarchive(objectId, additionalQueryParam);
        timedActions(
          () => {
            setState((state) => ({
              ...state,
              isProcessingRequest: false,
              showSuccess: true,
            }));
            onClosePane();
            notifyChanges();
          },
          () => {
            setState((state) => ({
              ...state,
              showSuccess: false,
            }));
          },
        );
      } catch (error) {
        timedActions(
          () => {
            setState((state) => ({
              ...state,
              isProcessingRequest: false,
              showError: true,
            }));
          },
          () => {
            setState((state) => ({
              ...state,
              showError: false,
            }));
          },
        );
      }
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

  function onOpenPane(data?: T) {
    navigate(navigateTo(normalizeObjectId(data?.id)));
  }

  function onClosePane() {
    navigate(navigateFrom());
  }

  useEffect(() => {
    if (objectId) {
      let data = Object.assign({}, initialState);
      if (objectId && objectId !== CREATE) {
        data = objectCollectionReference
          .filter((objectRef) => {
            return objectRef.id == objectId;
          })
          .shift() as T;
      }
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

  return Object.assign(util, {
    objectId: normalizeObjectId(objectId),
    state: state,
    onSubmit: onSubmit,
    onRemove: onRemove,
    onUnarchive: onUnarchive,
    handleConfirmationClose: handleConfirmationClose,
    handleConfirmationShow: handleConfirmationShow,
    onOpenPane: onOpenPane,
    onClosePane: onClosePane,
    validationSchema: schema,
  });
}

export interface ListDataState<T> extends CommonState {
  data: (T | Empty)[];
  cursor?: string;
  hasMore: boolean;
}

export interface ListStateManagementFunctions<T> {
  state: ListDataState<T>;
  invalidate: () => void;
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
    invalidate: true,
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

  function invalidate() {
    setState((state) => ({
      ...state,
      invalidate: true,
    }));
  }

  useEffect(() => {
    if (state.invalidate) {
      setState((state) => ({
        ...state,
        invalidate: false,
      }));
      fetchItems();
    }
  }, [state.invalidate]);

  return {
    state: state,
    invalidate: invalidate,
    fetchItems: fetchItems,
  };
}
