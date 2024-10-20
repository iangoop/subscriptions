import { Product } from '@mytypes/model';
import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from 'src/util/Formatters';
import { useTranslation } from 'react-i18next';
import { Empty } from '@mytypes/util';
import './ProductCard.scss';
import { LoadingText } from '../Skeleton';

const ProductCard: React.FC<{ product: Product | Empty }> = (props) => {
  if (props.product.id) {
    const { t } = useTranslation();
    return (
      <li className="product-row">
        <Link to={`/products/${props.product.id}`}>
          <div className="image-container">
            <img src={props.product.thumbnailUrl} />
          </div>
          <div className="card-details">
            <small className="product-name">{props.product.name}</small>
            <small className="product-price">
              {formatCurrency(props.product.price)}
            </small>
            <small className="product-in-stock">
              {props.product.qtyInStock > 0
                ? t('product.inStock')
                : t('product.notInStock')}
            </small>
          </div>
        </Link>
      </li>
    );
  } else {
    return (
      <li className="product-row skeleton">
        <a>
          <div className="image-container">
            <div className="img loading"></div>
          </div>
          <div className="card-details">
            <small className="product-name">
              <LoadingText charactersQty={40}></LoadingText>
            </small>
            <small className="product-price">
              <LoadingText charactersQty={6}></LoadingText>
            </small>
            <small className="product-in-stock">
              <LoadingText charactersQty={10}></LoadingText>
            </small>
          </div>
        </a>
      </li>
    );
  }
};

export default ProductCard;
