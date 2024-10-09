import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import Modal from 'react-bootstrap/Modal';
import useProductController, { Props } from 'src/controllers/ProductController';
import { useTranslation } from 'react-i18next';
import './Product.scss';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import ThumbnailUrl from 'src/components/Thumbnail';

const ProductView: React.FC<Props> = (props) => {
  const controller = useProductController(props);
  const { t } = useTranslation();

  return (
    <>
      <div className="panel-body">
        <h1>{t('product.productPageTitle')}</h1>
        <Formik
          enableReinitialize={true}
          initialValues={controller.state.data}
          validationSchema={controller.validationSchema}
          onSubmit={controller.onSubmit}
          validateOnBlur={true}
        >
          <Form className="product-form">
            <div className="image-column">
              <ThumbnailUrl />
            </div>
            <div className="description-column">
              <div>
                <label className="form-label" htmlFor="thumbnailUrl">
                  <span>{t('product.thumbnailUrlLbl')}</span>
                  <ErrorMessage name="thumbnailUrl" component="small" />
                </label>
                <Field
                  className="input-control form-control"
                  type="text"
                  name="thumbnailUrl"
                  placeholder={t('product.thumbnailUrlPlaceholder')}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="name">
                  <span>{t('product.nameLbl')}</span>
                  <ErrorMessage name="name" component="small" />
                </label>
                <Field
                  className="input-control form-control"
                  type="text"
                  name="name"
                  placeholder={t('product.namePlaceholder')}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="sku">
                  <span>{t('product.skuLbl')}</span>
                  <ErrorMessage name="sku" component="small" />
                </label>
                <Field
                  className="input-control form-control"
                  type="text"
                  name="sku"
                  placeholder={t('product.skuPlaceholder')}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="shortDescription">
                  <span>{t('product.shortDescriptionLbl')}</span>
                  <ErrorMessage name="shortDescription" component="small" />
                </label>
                <Field
                  className="input-control form-control"
                  type="text"
                  name="shortDescription"
                  placeholder={t('product.shortDescriptionPlaceholder')}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="longDescription">
                  <span>{t('product.longDescriptionLbl')}</span>
                  <ErrorMessage name="longDescription" component="small" />
                </label>
                <Field
                  className="input-control form-control"
                  type="text"
                  name="longDescription"
                  placeholder={t('product.longDescriptionPlaceholder')}
                />
              </div>
            </div>
            <div className="control-column">
              <div>
                <label className="form-label" htmlFor="price">
                  <span>{t('product.priceLbl')}</span>
                  <ErrorMessage name="price" component="small" />
                </label>
                <Field
                  className="input-control form-control"
                  type="text"
                  name="price"
                  placeholder={t('product.pricePlaceholder')}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="qtyInStock">
                  <span>{t('product.qtyInStockLbl')}</span>
                  <ErrorMessage name="qtyInStock" component="small" />
                </label>
                <Field
                  className="input-control form-control"
                  type="text"
                  name="qtyInStock"
                  placeholder={t('product.qtyInStockPlaceholder')}
                />
              </div>
            </div>
            <div className="action">
              <Button type="submit">{t('general.submit')}</Button>
            </div>
          </Form>
        </Formik>
      </div>
      <Modal
        show={controller.state.showConfirmation}
        onHide={controller.handleConfirmationClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>{t('general.confirmationTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {t('product.confirmationModalMessage')}{' '}
          {t('general.confirmationNext')}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={controller.handleConfirmationClose}
          >
            {t('general.close')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ProductView;
