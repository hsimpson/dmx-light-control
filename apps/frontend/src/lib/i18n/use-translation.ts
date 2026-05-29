import { useIntl } from 'react-intl';

export function useTranslation() {
  const { formatMessage } = useIntl();

  return {
    t: formatMessage,
  };
}
