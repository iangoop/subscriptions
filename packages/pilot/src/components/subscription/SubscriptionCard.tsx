import {
  Delivery,
  SubscriptionFromPlanning,
  SubscriptionPlanningReferenceData,
} from '@mytypes/model';
import { Empty } from '@mytypes/util';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { decodeSchedule, formatCurrency } from 'src/util/Formatters';
import './SubscriptionCard.scss';
import { Button } from 'react-bootstrap';

const SubscriptionCard: React.FC<{
  subscription: SubscriptionFromPlanning | Empty;
  delivery: Delivery | undefined;
  refereceData: SubscriptionPlanningReferenceData;
  isOnTimeFreeze?: boolean;
  planningDate: string;
  onSkip?: (
    subscription: SubscriptionFromPlanning,
    planningDate: string,
  ) => void;
}> = (props) => {
  const isRealSubscription = (
    subscription: SubscriptionFromPlanning | Empty,
  ): subscription is SubscriptionFromPlanning => !!subscription?.id;
  const getProduct = () => {
    if (props.refereceData && props.refereceData.products) {
      const product = props.refereceData.products.find((product) => {
        return product.id === props.subscription.productId;
      });
      return product;
    }
    return undefined;
  };
  const product = getProduct();
  const subscription = props.subscription;
  if (isRealSubscription(subscription)) {
    const { t } = useTranslation();

    const getProductName = () => {
      if (product) {
        return product.name;
      }
      return '';
    };
    const getProductPrice = () => {
      if (product) {
        return formatCurrency(product.price);
      }
      return '';
    };
    const getProductThumbnailUrl = () => {
      if (product) {
        return product.thumbnailUrl;
      }
      return '';
    };
    const getQuantityOrdered = () => {
      return props.subscription.quantity || 1;
    };
    const getScheduleLabel = () => {
      if (props.subscription.schedule) {
        const schedule = props.subscription.schedule;
        const decodedSchedule = decodeSchedule(schedule);
        if (!decodedSchedule) {
          return '';
        }
        const orderedQuantity = getQuantityOrdered();
        const { period, type } = decodedSchedule;
        const typeCode = period > 1 ? type + 's' : type;
        const frequencyType =
          'frequency' + (orderedQuantity > 1 ? 'Many' : 'Single') + 'Qty';
        return t(`subscription.schedule.${frequencyType}`, {
          quantity: orderedQuantity,
          period: period + ' ' + t(`subscription.schedule.period.${typeCode}`),
        });
      }
      return '';
    };
    const canSkipSubscription = () => {
      return props.subscription.canSkip;
    };
    const planningDate = props.planningDate;
    return (
      <li className="item-row subscription-card">
        <div className="image-container">
          <img src={getProductThumbnailUrl()} />
        </div>
        <span className="product-name">{getProductName()}</span>
        <span className="product-price">{getProductPrice()}</span>
        {props.isOnTimeFreeze ? (
          <span className="ordered-quantity">
            {t('product.qtyLbl')}: {getQuantityOrdered()}
          </span>
        ) : (
          <span className="schedule">{getScheduleLabel()}</span>
        )}
        {canSkipSubscription() && (
          <span className="can-skip">
            <Button
              className="btn-sm"
              id={props.planningDate}
              onClick={() => props.onSkip?.(subscription, planningDate)}
            >
              <span className="sr-only">
                {t('subscription.skipAction.skipLbl')}
              </span>
            </Button>
          </span>
        )}
      </li>
    );
  }

  return <div></div>;
};

export default SubscriptionCard;
