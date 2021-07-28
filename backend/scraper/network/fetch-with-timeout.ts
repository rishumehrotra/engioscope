import AbortController from 'abort-controller';
import fetch, { RequestInfo, RequestInit } from 'node-fetch';

export default (url: RequestInfo, init?: RequestInit & { timeout?: number}) => {
  const { timeout = 60000 } = init || {};
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeout);

  return fetch(url, { ...(init || {}), signal: controller.signal })
    .catch(err => {
      if (err.name === 'AbortError') {
        throw new Error(`Timeout: ${url} took longer than ${timeout / 1000}s to respond.`);
      }
      throw err;
    })
    .finally(() => clearTimeout(timeoutHandle));
};
