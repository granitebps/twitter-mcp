export function withDeadline<T>(
  operation: Promise<T>,
  signal: AbortSignal,
  deadline: number,
  createTimeoutError: () => Error,
): Promise<T> {
  const remaining = deadline - Date.now();
  if (signal.aborted || remaining <= 0) throw createTimeoutError();

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(createTimeoutError()), remaining);
    const abort = () => reject(createTimeoutError());
    signal.addEventListener("abort", abort, { once: true });

    operation.then(resolve, reject).finally(() => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    });
  });
}
