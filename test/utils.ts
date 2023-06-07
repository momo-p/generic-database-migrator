export type ConditionFn = () => boolean;

export const waitUntil = ({
  fn,
  timeout,
}: {
  fn: ConditionFn;
  timeout?: number;
}) => {
  timeout ??= 2000;
  const start = Date.now();
  while (Date.now() - start < timeout && !fn());
};
