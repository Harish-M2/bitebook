export async function withRequestTimeout<Result>(
  request: (signal: AbortSignal) => PromiseLike<Result>,
  signal?: AbortSignal,
  timeoutMs = 15_000,
): Promise<Result> {
  if (signal?.aborted) throw new Error('Request cancelled.');
  const controller = new AbortController();
  let rejectBoundary: (error: Error) => void = () => {};
  const boundary = new Promise<never>((_resolve, reject) => { rejectBoundary = reject; });
  const cancel = () => { rejectBoundary(new Error('Request cancelled.')); controller.abort(); };
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => {
    rejectBoundary(new Error('Request timed out. Please try again.'));
    controller.abort();
  }, timeoutMs);
  try {
    return await Promise.race([Promise.resolve().then(() => request(controller.signal)), boundary]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}