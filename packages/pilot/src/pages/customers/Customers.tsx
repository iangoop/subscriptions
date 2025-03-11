import { CREATE } from '@mytypes/crud';
import React from 'react';
import { Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import useCustomerListController from 'src/controllers/CustomerListController';
import './Customers.scss';
import CustomerCard from 'src/components/customer/CustomerCard';
import { Props } from 'src/controllers/CommonController';

const ProductsView: React.FC<Props> = (props) => {
  const controller = useCustomerListController(props);
  const { t } = useTranslation();

  const listItems = () => {
    return (controller.state.data ?? []).map((item, i) => (
      <CustomerCard
        key={item.id ? 'c-card' + item.id : 'c-card-skeleton' + i}
        customer={item}
      />
    ));
  };

  return (
    <div className="customers-page panel-body">
      <div className="title">
        <h1>{t('customer.listPageTitle')}</h1>
        <Button href={`/customers/${CREATE}`}>
          {t('general.addNew')} {t('customer.instance')}
        </Button>
      </div>

      <ul className="item-list">{listItems()}</ul>
      <div className="action">
        <Button
          onClick={controller.fetchItems}
          disabled={!controller.state.hasMore || controller.state.isLoading}
        >
          <span
            className={`spinner-border spinner-border-sm ${controller.state.isLoading ? '' : 'd-none'}`}
          ></span>
          <span className="sr-only">
            {controller.state.isLoading
              ? t('general.loading')
              : t('general.loadMore')}
          </span>
        </Button>
      </div>
    </div>
  );
};

export default ProductsView;
