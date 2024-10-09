import React, { useEffect } from 'react';
import { useFormikContext, Formik, Form, Field } from 'formik';
import { Product } from '@mytypes/model';
import { imagePlaceholder } from 'src/util/Formatters';

function ThumbnailUrl() {
  const { values, submitForm } = useFormikContext<Product>();
  const placeholderUrl = 'https://placehold.co/300x300';

  return (
    <div className="image-container">
      <img src={values.thumbnailUrl ? values.thumbnailUrl : imagePlaceholder} />
    </div>
  );
}

export default ThumbnailUrl;
