import { useFormikContext } from 'formik';
import { Product } from '@mytypes/model';
import { imagePlaceholder } from 'src/util/Formatters';

function ThumbnailUrl() {
  const { values } = useFormikContext<Product>();

  return (
    <div className="image-container">
      <img src={values.thumbnailUrl ? values.thumbnailUrl : imagePlaceholder} />
    </div>
  );
}

export default ThumbnailUrl;
