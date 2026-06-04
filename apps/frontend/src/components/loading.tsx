import { Center, Loader, LoaderProps, Stack, Text } from '@mantine/core';

type LoadingProps = {
  /**
   * Optional message to display below the loader
   */
  message?: string;
  /**
   * Size of the loader
   * @default 'md'
   */
  size?: LoaderProps['size'];
  /**
   * Type of loader
   * @default 'oval'
   */
  type?: LoaderProps['type'];
  /**
   * Whether to center the loader vertically and horizontally
   * @default true
   */
  centered?: boolean;
  /**
   * Minimum height when centered
   * @default 200
   */
  minHeight?: number | string;
};

export const Loading = ({ message, size = 'md', type = 'oval', centered = true, minHeight = 200 }: LoadingProps) => {
  const content = (
    <Stack align="center" gap="md">
      <Loader size={size} type={type} />
      {message && (
        <Text size="sm" c="dimmed">
          {message}
        </Text>
      )}
    </Stack>
  );

  if (centered) {
    return <Center style={{ minHeight }}>{content}</Center>;
  }

  return content;
};
