import { FormDataState } from 'src/controllers/CommonController';
import React from 'react';
import { Button } from 'react-bootstrap';
import { Archivable } from '@mytypes/model';
import { useTranslation } from 'react-i18next';

const ArchiveAction: React.FC<{
  state: FormDataState<Archivable>;
  show?: boolean;
  onArchive: () => void;
  onUnarchive: () => void;
}> = (props) => {
  const { t } = useTranslation();
  const show = props.show === undefined ? true : props.show;
  return (
    <>
      <Button
        variant="danger"
        onClick={props.onArchive}
        className={`${props.state.data.isActive && show ? '' : 'd-none'}`}
      >
        <span
          className={`spinner-border spinner-border-sm ${props.state.isProcessingRequest ? '' : 'd-none'}`}
        ></span>
        <span className="sr-only">
          {props.state.isProcessingRequest
            ? t('general.archiving')
            : t('general.archive')}
        </span>
      </Button>
      <Button
        variant="warning"
        onClick={props.onUnarchive}
        className={`${props.state.data.isActive || !show ? 'd-none' : ''}`}
      >
        <span
          className={`spinner-border spinner-border-sm ${props.state.isProcessingRequest ? '' : 'd-none'}`}
        ></span>
        <span className="sr-only">
          {props.state.isProcessingRequest
            ? t('general.unarchiving')
            : t('general.unarchive')}
        </span>
      </Button>
    </>
  );
};
export default ArchiveAction;
