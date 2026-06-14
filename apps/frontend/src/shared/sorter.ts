export const orderSorter = <T extends { order: number }>(a: T, b: T): number => {
  return a.order - b.order;
};

export const dmxRangeSorter = <T extends { dmxStart: number; dmxEnd: number }>(a: T, b: T): number => {
  return a.dmxStart - b.dmxEnd;
};
