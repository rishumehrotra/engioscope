const wait = (ms: number) => new Promise(resolve => { setTimeout(resolve, ms); });

const retry = <T>(fn: () => Promise<T>, { retryCount = 10, waitTime = 1 } = {}): Promise<T> => (
  fn().catch(async err => {
    if (retryCount <= 0) throw err;
    await wait(waitTime * 1000);
    return retry(fn, { retryCount: retryCount - 1, waitTime });
  })
);

export default retry;
