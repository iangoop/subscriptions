import { ById } from '@mytypes/crud';
import { Props } from './CommonController';
import { useParams } from 'react-router-dom';
import EnvVars from 'src/util/EnvVars';
import axios from 'axios';
import {
  CustomerAddress,
  SubscriptionFromPlanning,
  SubscriptionPlanningRecord,
} from '@mytypes/model';
import React, { useEffect, useState } from 'react';

type SkipSubscriptionPaneState = {
  isOpen: boolean;
  isLoading: boolean;
  planningDate: string;
  subscription?: SubscriptionFromPlanning;
};

function useCustomerSubscriptionsPlanningController(props: Props) {
  const { id: customerId } = useParams<ById>();
  const [loading, setLoading] = useState<boolean>(true);
  const [customerSubscriptionPlanning, setCustomerSubscriptionPlanning] =
    useState<SubscriptionPlanningRecord>();
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress>();
  const [skipSubscriptionPaneState, setSkipSubscriptionPaneState] =
    useState<SkipSubscriptionPaneState>({
      isOpen: false,
      isLoading: false,
      planningDate: '',
    });

  async function getCustomerSubscriptionPlanningData(customerId: string) {
    setLoading(true);
    const response = await axios.post<SubscriptionPlanningRecord>(
      `${EnvVars.apiUrl}/subscriptions/customer-subscription-planning`,
      { customerId },
    );
    if (response.data) {
      setCustomerSubscriptionPlanning(response.data);
      if (response.data.data && response.data.data.customerAddresses.length) {
        setSelectedAddress(response.data.data.customerAddresses[0]);
      }
    }
    setLoading(false);
  }

  function handleSelectedAddressChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    if (
      customerSubscriptionPlanning &&
      customerSubscriptionPlanning.data.customerAddresses.length
    ) {
      const address = customerSubscriptionPlanning.data.customerAddresses.find(
        (item) => {
          return item.id === event.target.value;
        },
      );
      setSelectedAddress(address);
    }
  }
  function getSubscriptionsForSelectedAddress() {
    if (selectedAddress && customerSubscriptionPlanning) {
      return customerSubscriptionPlanning.planning[selectedAddress.id!];
    }
    return null;
  }
  function openSkipSubscriptionPaneState(
    subscription: SubscriptionFromPlanning,
    planningDate: string,
  ) {
    setSkipSubscriptionPaneState({
      ...skipSubscriptionPaneState,
      isOpen: true,
      subscription,
      planningDate,
    });
  }
  function closeSkipSubscriptionPane() {
    setSkipSubscriptionPaneState({
      ...skipSubscriptionPaneState,
      isOpen: false,
      subscription: undefined,
      planningDate: '',
    });
  }
  function getProduct(subscription?: SubscriptionFromPlanning) {
    if (!subscription || !customerSubscriptionPlanning?.data?.products) {
      return undefined;
    }
    return customerSubscriptionPlanning.data.products.find((product) => {
      return product.id === subscription.productId;
    });
  }
  async function confirmSkipSubscriptionPane() {
    if (skipSubscriptionPaneState.subscription) {
      setSkipSubscriptionPaneState({
        ...skipSubscriptionPaneState,
        isLoading: true,
      });
      try {
        await axios.post(`${EnvVars.apiUrl}/subscriptions/skip-subscription`, {
          id: skipSubscriptionPaneState.subscription.id,
          customerId: skipSubscriptionPaneState.subscription.customerId,
        });
        setSkipSubscriptionPaneState({
          ...skipSubscriptionPaneState,
          isLoading: false,
          isOpen: false,
        });
      } catch (error) {
        setSkipSubscriptionPaneState({
          ...skipSubscriptionPaneState,
          isLoading: false,
        });
      }
    }
  }

  useEffect(() => {
    if (customerId) {
      getCustomerSubscriptionPlanningData(customerId);
    }
  }, [customerId]);

  return {
    loading,
    getProduct,
    customerSubscriptionPlanning,
    selectedAddress,
    handleSelectedAddressChange,
    getSubscriptionsForSelectedAddress,
    skipSubscriptionPaneState,
    openSkipSubscriptionPaneState,
    closeSkipSubscriptionPane,
    confirmSkipSubscriptionPane,
  };
}
export default useCustomerSubscriptionsPlanningController;
