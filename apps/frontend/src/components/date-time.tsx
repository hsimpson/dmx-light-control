'use client';

import { useIntl } from 'react-intl';

type DateTimeProperties = {
  /**
   * The date to display. Accepts a Date, a date string, or a timestamp.
   */
  date: Date | string | number;
  /**
   * Optional explicit format style. Defaults to a localized date and time.
   */
  format?: Intl.DateTimeFormatOptions;
};

const defaultFormat: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
  timeStyle: 'short',
};

export const DateTime = ({ date, format = defaultFormat }: DateTimeProperties) => {
  const intl = useIntl();

  return <time dateTime={new Date(date).toISOString()}>{intl.formatDate(date, format)}</time>;
};
