import { useFormikContext } from 'formik';
import { Product } from '@mytypes/model';
import EnvVars from 'src/util/EnvVars';

function ThumbnailUrl() {
  const { values } = useFormikContext<Product>();

  return (
    <div className="image-container">
      <img
        src={
          values.thumbnailUrl
            ? values.thumbnailUrl
            : `${EnvVars.imagePlaceholder}300x300`
        }
      />
    </div>
  );
}

export default ThumbnailUrl;
