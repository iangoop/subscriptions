import { ErrorMessage, Field, Form, Formik } from 'formik';
import { Alert, Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import ReactSlidingPane from 'react-sliding-pane';
import ArchiveAction from 'src/components/ArchiveAction';
import CustomerAddressCard from 'src/components/customer/CustomerAddressCard';
import { Props } from 'src/controllers/CommonController';
import useCustomerAddressController from 'src/controllers/CustomerAddressController';
const CustomerAddressView: React.FC<Props> = (props) => {
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
    <div className="panel-body">
      <div className="title">
        <h1>{t('customer.addressDetail.title')}</h1>
        <Button
          onClick={() => {
            controllerAddress.onOpenPane();
          }}
        >
          {t('general.addNew')} {t('customer.addressDetail.instance')}
        </Button>
      </div>

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
                  <label className="form-label" htmlFor="caFirstName">
                    <span>{t('customer.firstNameLbl')}</span>
                    <ErrorMessage name="firstName" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    id="caFirstName"
                    name="firstName"
                    placeholder={t('customer.firstNamePlaceholder')}
                  />
                </div>
                <div className="lastName">
                  <label className="form-label" htmlFor="caLastName">
                    <span>{t('customer.lastNameLbl')}</span>
                    <ErrorMessage name="lastName" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    id="caLastName"
                    name="lastName"
                    placeholder={t('customer.lastNamePlaceholder')}
                  />
                </div>
                <div className="phone">
                  <label className="form-label" htmlFor="caPhone">
                    <span>{t('customer.phoneLbl')}</span>
                    <ErrorMessage name="phone" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    id="caPhone"
                    name="phone"
                    placeholder={t('customer.phoneLblPlaceholder')}
                  />
                </div>
                <div className="company">
                  <label className="form-label" htmlFor="caCompany">
                    <span>{t('customer.companyLbl')}</span>
                    <ErrorMessage name="company" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    id="caCompany"
                    name="company"
                    placeholder={t('customer.companyLblPlaceholder')}
                  />
                </div>
                <div className="street1">
                  <label className="form-label" htmlFor="caStreet1">
                    <span>{t('customer.street1Lbl')}</span>
                    <ErrorMessage name="street1" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    id="caStreet1"
                    name="street1"
                    placeholder={t('customer.street1LblPlaceholder')}
                  />
                </div>
                <div className="street2">
                  <label className="form-label" htmlFor="caStreet2">
                    <span>{t('customer.street2Lbl')}</span>
                    <ErrorMessage name="street2" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    id="caStreet2"
                    name="street2"
                    placeholder={t('customer.street2LblPlaceholder')}
                  />
                </div>
                <div className="caStreet3">
                  <label className="form-label" htmlFor="street3">
                    <span>{t('customer.street3Lbl')}</span>
                    <ErrorMessage name="street3" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    id="caStreet3"
                    name="street3"
                    placeholder={t('customer.street3LblPlaceholder')}
                  />
                </div>
                <div className="city">
                  <label className="form-label" htmlFor="caCity">
                    <span>{t('customer.cityLbl')}</span>
                    <ErrorMessage name="city" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    id="caCity"
                    name="city"
                    placeholder={t('customer.cityLblPlaceholder')}
                  />
                </div>
                <div className="region">
                  <label className="form-label" htmlFor="caRegion">
                    <span>{t('customer.regionLbl')}</span>
                    <ErrorMessage name="region" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    id="caRegion"
                    name="region"
                    placeholder={t('customer.regionLblPlaceholder')}
                  />
                </div>
                <div className="postcode">
                  <label className="form-label" htmlFor="caPostcode">
                    <span>{t('customer.postcodeLbl')}</span>
                    <ErrorMessage name="postcode" component="small" />
                  </label>
                  <Field
                    disabled={controllerAddress.state.isLoading}
                    className="input-control form-control"
                    type="text"
                    id="caPostcode"
                    name="postcode"
                    placeholder={t('customer.postcodeLblPlaceholder')}
                  />
                </div>
                <div className="default">
                  <div className="form-check ">
                    <Field
                      disabled={controllerAddress.state.isLoading}
                      type="checkbox"
                      id="caIsDefault"
                      name="isDefault"
                      className="form-check-input"
                    />
                    <label className="form-check-label" htmlFor="caIsDefault">
                      <span>{t('customer.defaultLbl')}</span>
                    </label>
                  </div>
                </div>
                <div className="defaultBilling">
                  <div className="form-check ">
                    <Field
                      disabled={controllerAddress.state.isLoading}
                      type="checkbox"
                      id="caIsDefaultBilling"
                      name="isDefaultBilling"
                      className="form-check-input"
                    />
                    <label
                      className="form-check-label"
                      htmlFor="caIsDefaultBilling"
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
                      id="caIsDefaultShipping"
                      name="isDefaultShipping"
                      className="form-check-input"
                    />
                    <label
                      className="form-check-label"
                      htmlFor="caIsDefaultShipping"
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
                <ArchiveAction
                  show={controllerAddress.state.data.id ? true : false}
                  state={controllerAddress.state}
                  onArchive={controllerAddress.onRemove}
                  onUnarchive={controllerAddress.onUnarchive}
                ></ArchiveAction>
              </div>
            </Form>
          </Formik>
        </div>
      </ReactSlidingPane>

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
        show={controllerAddress.state.showSuccess}
        variant="success"
        className="floating small"
      >
        {t('general.apiSucess')}
      </Alert>
    </div>
  );
};
export default CustomerAddressView;
