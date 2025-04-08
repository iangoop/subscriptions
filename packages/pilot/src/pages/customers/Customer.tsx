import { ErrorMessage, Field, Form, Formik } from 'formik';
import { useTranslation } from 'react-i18next';
import './Customer.scss';
import useCustomerController from 'src/controllers/CustomerController';
import { Props } from 'src/controllers/CommonController';
import { Alert, Button, Modal } from 'react-bootstrap';
import CustomerAddressView from './CustomerAddress';

const CustomerView: React.FC<Props> = (props) => {
  const controller = useCustomerController(props);
  const { t } = useTranslation();

  return (
    <>
      <div className="panel-body">
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
      </div>
      {!controller.isUpdateOperation() && <CustomerAddressView />}
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
