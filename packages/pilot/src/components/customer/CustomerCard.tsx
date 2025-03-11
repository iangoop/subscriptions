import React from 'react';
import { Customer } from '@mytypes/model';
import { Empty } from '@mytypes/util';
import { Link } from 'react-router-dom';
import './CustomerCard.scss';
import EnvVars from 'src/util/EnvVars';
import { sanitizeNames } from 'src/util/Formatters';
import { LoadingText } from '../Skeleton';

const CustomerCard: React.FC<{ customer: Customer | Empty }> = (props) => {
  if (props.customer.id) {
    return (
      <li className="item-row customer-card">
        <Link to={`/customers/${props.customer.id}`}>
          <div className="image-container">
            <img
              src={
                EnvVars.avatarUrl +
                'username?username=' +
                sanitizeNames(props.customer.firstName, props.customer.lastName)
              }
            />
          </div>
          <div className="card-details">
            <small className="customer-name">
              {props.customer.firstName} {props.customer.lastName}
            </small>
            <small className="customer-email">{props.customer.email}</small>
          </div>
        </Link>
      </li>
    );
  } else {
    return (
      <li className="item-row customer-card skeleton">
        <a>
          <div className="image-container">
            <div className="img loading"></div>
          </div>
          <div className="card-details">
            <small className="customer-name">
              <LoadingText charactersQty={30}></LoadingText>
            </small>
            <small className="customer-email">
              <LoadingText charactersQty={40}></LoadingText>
            </small>
          </div>
        </a>
      </li>
    );
  }
};

export default CustomerCard;
