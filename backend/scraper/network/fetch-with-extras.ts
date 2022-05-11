import AbortController from 'abort-controller';
import type { RequestInfo, RequestInit } from 'node-fetch';
import fetch from 'node-fetch';
import https from 'https';

export default (url: RequestInfo, init?: RequestInit & { timeout?: number; verifySsl: boolean }) => {
  const { timeout = 60000, verifySsl, ...restInit } = init || {};
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeout);

  return fetch(url, {
    ...restInit,
    signal: controller.signal,
    agent: verifySsl === false
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined
  })
    .catch(err => {
      if (err.name === 'AbortError') {
        throw new Error(`Timeout: ${url} took longer than ${timeout / 1000}s to respond.`);
      }
      throw err;
    })
    .finally(() => clearTimeout(timeoutHandle));
};
