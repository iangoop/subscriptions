import { CREATE } from '@mytypes/crud';
import React from 'react';
import { Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useProductListController, {
  Props,
} from 'src/controllers/ProductListController';
import { formatCurrency } from 'src/util/Formatters';
import './Products.scss';

const ProductsView: React.FC<Props> = (props) => {
  const controller = useProductListController(props);
  const { t } = useTranslation();

  const listItems = () => {
    return (controller.state.data ?? []).map((item) => (
      <li key={item.id} className="product-row">
        <Link to={`/products/${item.id}`}>
          <div className="image-container">
            <img src={item.thumbnailUrl} />
          </div>
          <div className="card-details">
            <small className="product-name">{item.name}</small>
            <small className="product-price">
              {formatCurrency(item.price)}
            </small>
            <small className="product-in-stock">
              {item.qtyInStock > 0
                ? t('product.inStock')
                : t('product.notInStock')}
            </small>
          </div>
        </Link>
      </li>
    ));
  };

  return (
    <div className="panel-body">
      <div className="title">
        <h1>Products</h1>
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
          {t('general.loadMore')}
        </Button>
      </div>
    </div>
  );
};

export default ProductsView;
