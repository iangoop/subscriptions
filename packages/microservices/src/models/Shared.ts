export enum Schedule {
  Weeks1 = '1W',
  Weeks2 = '2W',
  Weeks3 = '3W',
  Weeks5 = '5W',
  Weeks6 = '6W',
  Weeks7 = '7W',
  Month1 = '1M',
  Month2 = '2M',
  Month3 = '3M',
  Month4 = '4M',
  Month5 = '5M',
  Month6 = '6M',
}

export enum DeliveryStatus {
  Active = 'A',
  Retry = 'R',
  Failed = 'F',
  WaitingPayment = 'W',
  Processing = 'P',
  Shipped = 'S',
  Completed = 'C',
}

export enum SubscriptionStatus {
  Active = 'A',
  Paused = 'P',
  Expired = 'E',
}

export enum SubscriptionOptionMode {
  subscriptionOnly = 'subscription_only',
  subscriptionAndOnetimePurchase = 'subscription_and_onetime_purchase',
}
export enum SubscriptionOption {
  Subscription = 'subscription',
  onetimePurchase = 'onetime_purchase',
}

export enum ShippingMode {
  RequiresShipping = 'requires_shipping',
  NoShpping = 'no_shipping',
}

export enum ConfigurationOptions {
  AutomaticRetry = 'automaticRetry',
  StandardIntervals = 'standardIntervals', //standard subscription intervals list
  StandardDefaultInterval = 'standardDefaultInterval', //standard selected interval for a subscription
  StandardDeliveryFreezeTime = 'standardDeliveryFreezeTime', //standard time to change anything in a delivery before processing
}
