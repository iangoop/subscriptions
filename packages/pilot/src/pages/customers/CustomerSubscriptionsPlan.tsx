import { SubscriptionsGroup } from '@mytypes/model';
import { Button, Form, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import SubscriptionCard from 'src/components/subscription/SubscriptionCard';
import { Props } from 'src/controllers/CommonController';
import useCustomerSubscriptionsPlanningController from 'src/controllers/CustomerSubscriptionsPlanController';
import { formatAddress, formatDate } from 'src/util/Formatters';
import './CustomerSubscriptionsPlan.scss';

const CustomerSubscriptionsPlanView: React.FC<Props> = (props) => {
  const controller = useCustomerSubscriptionsPlanningController(props);
  const { t } = useTranslation();
  const listAddresses = () => {
    return controller.customerSubscriptionPlanning!.data.customerAddresses.map(
      (item, i) => (
        <option key={'planning-address' + item.id} value={item.id}>
          {formatAddress(item)}
        </option>
      ),
    );
  };
  const listSubscriptionsCards = (
    planningDate: string,
    subscriptionsGroup: SubscriptionsGroup,
  ) => {
    return subscriptionsGroup.subscriptions.map((subscription) => (
      <SubscriptionCard
        key={'sub-card-' + subscription.id}
        subscription={subscription}
        delivery={subscriptionsGroup.delivery}
        planningDate={planningDate}
        refereceData={controller.customerSubscriptionPlanning!.data}
        isOnTimeFreeze={subscriptionsGroup.isOnDateFreeze}
        onSkip={controller.openSkipSubscriptionPaneState}
      />
    ));
  };
  const subscriptionsForAddress =
    controller.getSubscriptionsForSelectedAddress();
  const product = controller.getProduct(
    controller.skipSubscriptionPaneState.subscription,
  );
  return (
    <div className="panel-body">
      <div className="title">
        <h1>{t('subscription.title')}</h1>
      </div>
      {controller.customerSubscriptionPlanning &&
        controller.customerSubscriptionPlanning.data.customerAddresses && (
          <div className="customer-subscriptions-plan">
            <Form.Select
              onChange={controller.handleSelectedAddressChange}
              defaultValue={
                controller.selectedAddress ? controller.selectedAddress.id : ''
              }
            >
              {listAddresses()}
            </Form.Select>
            {subscriptionsForAddress &&
              Object.entries(subscriptionsForAddress).map(
                ([date, deliverables]) => (
                  <div
                    className="deliveries-date-row"
                    key={'planning-date-' + date}
                  >
                    <div className="delivery-date-card">
                      <div className="delivery-date">{formatDate(date)}</div>
                      {deliverables.lastDayToEdit && (
                        <div className="last-day-to-edit">
                          {t(
                            'subscription.lastDayToEdit.' +
                              (deliverables.isOnDateFreeze ? 'was' : 'is'),
                          )}{' '}
                          {formatDate(deliverables.lastDayToEdit)}
                        </div>
                      )}
                      {deliverables.canSkipAll &&
                        deliverables.subscriptions.length > 1 && (
                          <div className="can-skip action">
                            <Button>
                              <span className="sr-only">
                                {t('subscription.skipAction.skipAllLbl')}
                              </span>
                            </Button>
                          </div>
                        )}
                    </div>
                    <ul className="item-list">
                      {listSubscriptionsCards(date, deliverables)}
                    </ul>
                  </div>
                ),
              )}

            <Modal
              show={controller.skipSubscriptionPaneState.isOpen}
              onHide={controller.closeSkipSubscriptionPane}
              className="subscription-modal"
            >
              <Modal.Header closeButton>
                <Modal.Title>
                  {t('subscription.skipAction.confirmSkipTitle')}
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {t('subscription.skipAction.skipDateLbl', {
                  date: formatDate(
                    controller.skipSubscriptionPaneState.planningDate,
                  ),
                })}
                {product && (
                  <div className="product-row">
                    <div>
                      <img
                        src={product.thumbnailUrl}
                        alt={product.name}
                        className="product-thumbnail"
                      />
                    </div>
                    <div>{product.name}</div>
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="primary"
                  onClick={controller.confirmSkipSubscriptionPane}
                  disabled={controller.skipSubscriptionPaneState.isLoading}
                >
                  {t('subscription.skipAction.confirmSkipLbl')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={controller.closeSkipSubscriptionPane}
                  disabled={controller.skipSubscriptionPaneState.isLoading}
                >
                  {t('subscription.skipAction.dontSkipLbl')}
                </Button>
              </Modal.Footer>
            </Modal>
          </div>
        )}
    </div>
  );
};
export default CustomerSubscriptionsPlanView;
