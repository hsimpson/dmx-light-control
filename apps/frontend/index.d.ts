/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '*.css' {
  const styles: Record<string, string>;
  export default styles;
}

declare module '*.svg' {
  const content: any;
  export const ReactComponent: any;
  export default content;
}
