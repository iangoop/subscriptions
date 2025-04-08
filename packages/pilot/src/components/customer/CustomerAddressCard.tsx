import React from 'react';
import { CustomerAddress } from '@mytypes/model';
import { Empty } from '@mytypes/util';
import { LoadingText } from '../Skeleton';
import './CustomerAddressCard.scss';
import { useTranslation } from 'react-i18next';
import { Button } from 'react-bootstrap';

const CustomerAddressCard: React.FC<{
  customerAddress: CustomerAddress | Empty;
  onClickEdit: (item: CustomerAddress) => void;
}> = (props) => {
  const { t } = useTranslation();
  if (props.customerAddress.id) {
    return (
      <li className="item-row customer-address-card">
        <div className="content">
          <div>
            <span className="title">
              {t('customer.addressDetail.customerName')}
            </span>
            <span className="value">
              {props.customerAddress.firstName} {props.customerAddress.lastName}
            </span>
          </div>
          <div>
            <span className="title">
              {t('customer.addressDetail.customerPhone')}
            </span>
            <span className="value">{props.customerAddress.phone}</span>
          </div>
          <div>
            <span className="title">
              {t('customer.addressDetail.addressCompany')}
            </span>
            <span className="value">{props.customerAddress.company}</span>
          </div>
          <div>
            <span className="title">
              {t('customer.addressDetail.addressText')}
            </span>
            <span className="value address-text">
              <span>{props.customerAddress.street1}</span>
              <span>{props.customerAddress.street2}</span>
              <span>{props.customerAddress.street3}</span>
              <span>{props.customerAddress.region}</span>
              <span>{props.customerAddress.city}</span>
            </span>
          </div>
          <div>
            <span className="title">
              {t('customer.addressDetail.addressPostcode')}
            </span>
            <span className="value">{props.customerAddress.postcode}</span>
          </div>
          <div className="tags">
            {props.customerAddress.isDefault && (
              <span className="badge text-bg-primary">
                {t('customer.addressDetail.default')}
              </span>
            )}
            {props.customerAddress.isDefaultBilling && (
              <span className="badge text-bg-secondary">
                {t('customer.addressDetail.defaultBilling')}
              </span>
            )}
            {props.customerAddress.isDefaultShipping && (
              <span className="badge text-bg-secondary">
                {t('customer.addressDetail.defaultShipping')}
              </span>
            )}
            {!props.customerAddress.isActive && (
              <span className="badge text-bg-light">
                {t('general.archived')}
              </span>
            )}
          </div>
        </div>
        <div className="action">
          <Button
            onClick={() => {
              props.onClickEdit(props.customerAddress as CustomerAddress);
            }}
          >
            <span className="sr-only">{t('general.edit')}</span>
          </Button>
        </div>
      </li>
    );
  } else {
    return (
      <li className="item-row customer-address-card skeleton">
        <div className="card-details">
          <small className="customer-name">
            <LoadingText charactersQty={30}></LoadingText>
          </small>
          <small className="customer-postcode">
            <LoadingText charactersQty={10}></LoadingText>
          </small>
        </div>
      </li>
    );
  }
};

export default CustomerAddressCard;
