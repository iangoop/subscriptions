import { CREATE } from '@mytypes/crud';
import React from 'react';
import { Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import useProductListController from 'src/controllers/ProductListController';
import './Products.scss';
import ProductCard from 'src/components/product/ProductCard';
import { Props } from 'src/controllers/CommonController';

const ProductsView: React.FC<Props> = (props) => {
  const controller = useProductListController(props);
  const { t } = useTranslation();

  const listItems = () => {
    return (controller.state.data ?? []).map((item, i) => (
      <ProductCard
        key={item.id ? 'p-card' + item.id : 'p-card-skeleton' + i}
        product={item}
      />
    ));
  };

  return (
    <div className="products-page panel-body">
      <div className="title">
        <h1>{t('product.listPageTitle')}</h1>
        <Button href={`/products/${CREATE}`}>
          {t('general.addNew')} {t('product.instance')}
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
