import { ErrorMessage, Field, Form, Formik } from 'formik';
import { useTranslation } from 'react-i18next';
import './Customer.scss';
import useCustomerController from 'src/controllers/CustomerController';
import useCustomerAddressController from 'src/controllers/CustomerAddressController';
import CustomerAddressCard from 'src/components/customer/CustomerAddressCard';
import { Props } from 'src/controllers/CommonController';
import { Alert, Button, Modal } from 'react-bootstrap';
import ReactSlidingPane from 'react-sliding-pane';

const CustomerView: React.FC<Props> = (props) => {
  const controller = useCustomerController(props);
  const controllerAddress = useCustomerAddressController(props);
  const { t } = useTranslation();

  const listAddresses = () => {
    return (controllerAddress.listState.data ?? []).map((item, i) => (
      <CustomerAddressCard
        key={item.id ? 'ca-card' + item.id : 'ca-card-skeleton' + i}
        customerAddress={item}
        onClickEdit={controllerAddress.onOpenPane}
      />
    ));
  };

  return (
    <>
      <div className="panel-body"></div>
      <h1>{t('customer.editPageTitle')}</h1>
      <Formik
        enableReinitialize={true}
        initialValues={controller.state.data}
        validationSchema={controller.validationSchema}
        onSubmit={controller.onSubmit}
        validateOnBlur={true}
      >
        <Form
          className={`customer-form skeleton ${controller.state.isLoading ? 'form-loading' : ''}`}
        >
          <div className="form-group">
            <div className="email">
              <label className="form-label" htmlFor="email">
                <span>{t('customer.emailLbl')}</span>
                <ErrorMessage name="email" component="small" />
              </label>
              <Field
                disabled={controller.state.isLoading}
                className="input-control form-control"
                type="text"
                name="email"
                placeholder={t('customer.emailPlaceholder')}
              />
            </div>
            <div className="firstName">
              <label className="form-label" htmlFor="firstName">
                <span>{t('customer.firstNameLbl')}</span>
                <ErrorMessage name="firstName" component="small" />
              </label>
              <Field
                disabled={controller.state.isLoading}
                className="input-control form-control"
                type="text"
                name="firstName"
                placeholder={t('customer.firstNamePlaceholder')}
              />
            </div>
            <div className="lastName">
              <label className="form-label" htmlFor="lastName">
                <span>{t('customer.lastNameLbl')}</span>
                <ErrorMessage name="lastName" component="small" />
              </label>
              <Field
                disabled={controller.state.isLoading}
                className="input-control form-control"
                type="text"
                name="lastName"
                placeholder={t('customer.lastNamePlaceholder')}
              />
            </div>
          </div>
          <div className="action">
            <Button type="submit">
              <span
                className={`spinner-border spinner-border-sm ${controller.state.isSubmiting ? '' : 'd-none'}`}
              ></span>
              <span className="sr-only">
                {controller.state.isSubmiting
                  ? t('general.submiting')
                  : t('general.submit')}
              </span>
            </Button>
          </div>
        </Form>
      </Formik>
      <h1>{t('customer.addressDetail.title')}</h1>
      <div className="customer-address-list">
        <ul className="item-list">{listAddresses()}</ul>
      </div>
      <ReactSlidingPane
        className="right_slide_pane"
        title={t('customer.addressDetail.title_edit')}
        isOpen={controllerAddress.state.isPaneOpen}
        onRequestClose={controllerAddress.onClosePane}
      >
        <div>
          <Formik
            enableReinitialize={true}
            initialValues={controllerAddress.state.data}
            validationSchema={controllerAddress.validationSchema}
            onSubmit={controllerAddress.onSubmit}
            validateOnBlur={true}
          >
            <Form
              className={`customer-address-form skeleton ${controllerAddress.state.isLoading ? 'form-loading' : ''}`}
            >
              <div className="form-group">
                <div className="firstName">
                  <label className="form-label" htmlFor="firstName">
                    <span>{t('customer.firstNameLbl')}</span>
                    <ErrorMessage name="firstName" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    name="firstName"
                    placeholder={t('customer.firstNamePlaceholder')}
                  />
                </div>
                <div className="lastName">
                  <label className="form-label" htmlFor="lastName">
                    <span>{t('customer.lastNameLbl')}</span>
                    <ErrorMessage name="lastName" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    name="lastName"
                    placeholder={t('customer.lastNamePlaceholder')}
                  />
                </div>
                <div className="phone">
                  <label className="form-label" htmlFor="phone">
                    <span>{t('customer.phoneLbl')}</span>
                    <ErrorMessage name="phone" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    name="phone"
                    placeholder={t('customer.phoneLblPlaceholder')}
                  />
                </div>
                <div className="company">
                  <label className="form-label" htmlFor="company">
                    <span>{t('customer.companyLbl')}</span>
                    <ErrorMessage name="company" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    name="company"
                    placeholder={t('customer.companyLblPlaceholder')}
                  />
                </div>
                <div className="street1">
                  <label className="form-label" htmlFor="street1">
                    <span>{t('customer.street1Lbl')}</span>
                    <ErrorMessage name="street1" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    name="street1"
                    placeholder={t('customer.street1LblPlaceholder')}
                  />
                </div>
                <div className="street2">
                  <label className="form-label" htmlFor="street2">
                    <span>{t('customer.street2Lbl')}</span>
                    <ErrorMessage name="street2" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    name="street2"
                    placeholder={t('customer.street2LblPlaceholder')}
                  />
                </div>
                <div className="street3">
                  <label className="form-label" htmlFor="street3">
                    <span>{t('customer.street3Lbl')}</span>
                    <ErrorMessage name="street3" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    name="street3"
                    placeholder={t('customer.street3LblPlaceholder')}
                  />
                </div>
                <div className="city">
                  <label className="form-label" htmlFor="city">
                    <span>{t('customer.cityLbl')}</span>
                    <ErrorMessage name="city" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    name="city"
                    placeholder={t('customer.cityLblPlaceholder')}
                  />
                </div>
                <div className="region">
                  <label className="form-label" htmlFor="citregiony">
                    <span>{t('customer.regionLbl')}</span>
                    <ErrorMessage name="region" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    name="region"
                    placeholder={t('customer.regionLblPlaceholder')}
                  />
                </div>
                <div className="postcode">
                  <label className="form-label" htmlFor="postcode">
                    <span>{t('customer.postcodeLbl')}</span>
                    <ErrorMessage name="postcode" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    name="postcode"
                    placeholder={t('customer.postcodeLblPlaceholder')}
                  />
                </div>
                <div className="default">
                  <div className="form-check ">
                    <Field
                      disabled={controllerAddress.state.isLoading}
                      type="checkbox"
                      name="isDefault"
                      className="form-check-input"
                    />
                    <label className="form-check-label" htmlFor="isDefault">
                      <span>{t('customer.defaultLbl')}</span>
                    </label>
                  </div>
                </div>
                <div className="defaultBilling">
                  <div className="form-check ">
                    <Field
                      disabled={controllerAddress.state.isLoading}
                      type="checkbox"
                      name="isDefaultBilling"
                      className="form-check-input"
                    />
                    <label
                      className="form-check-label"
                      htmlFor="isDefaultBilling"
                    >
                      <span>{t('customer.defaultBillingLbl')}</span>
                    </label>
                  </div>
                </div>
                <div className="defaultShipping">
                  <div className="form-check ">
                    <Field
                      disabled={controllerAddress.state.isLoading}
                      type="checkbox"
                      name="isDefaultShipping"
                      className="form-check-input"
                    />
                    <label
                      className="form-check-label"
                      htmlFor="isDefaultShipping"
                    >
                      <span>{t('customer.defaultShippingLbl')}</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="action">
                <Button type="submit">
                  <span
                    className={`spinner-border spinner-border-sm ${controllerAddress.state.isSubmiting ? '' : 'd-none'}`}
                  ></span>
                  <span className="sr-only">
                    {controllerAddress.state.isSubmiting
                      ? t('general.submiting')
                      : t('general.submit')}
                  </span>
                </Button>
              </div>
            </Form>
          </Formik>
        </div>
      </ReactSlidingPane>
      <Modal
        show={controller.state.showConfirmation}
        onHide={controller.handleConfirmationClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>{t('general.confirmationTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {t('customer.confirmationModalMessage')}{' '}
          {t('general.confirmationNext')}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={controller.handleConfirmationClose}
            disabled={controller.state.isLoading}
          >
            {t('general.close')}
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={controllerAddress.state.showConfirmation}
        onHide={controllerAddress.handleConfirmationClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>{t('general.confirmationTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {t('customer.addressDetail.confirmationModalMessage')}{' '}
          {t('general.confirmationNext')}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={controllerAddress.handleConfirmationClose}
            disabled={controllerAddress.state.isLoading}
          >
            {t('general.close')}
          </Button>
        </Modal.Footer>
      </Modal>
      <Alert
        show={controllerAddress.state.showError}
        variant="danger"
        className="floating small"
      >
        {t('general.apiError')}
      </Alert>
      <Alert
        show={controller.state.showError}
        variant="danger"
        className="floating small"
      >
        {t('general.apiError')}
      </Alert>
    </>
  );
};
export default CustomerView;
