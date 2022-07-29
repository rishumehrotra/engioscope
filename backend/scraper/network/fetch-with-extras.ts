import AbortController from 'abort-controller';
import type { RequestInfo, RequestInit } from 'node-fetch';
import fetch from 'node-fetch';
import https from 'https';
import pLimit from 'p-limit';
import { constants } from 'node:crypto';

const limit = pLimit(35);

export default (url: RequestInfo, init?: RequestInit & { timeout?: number; verifySsl: boolean }) => {
  const { timeout = 60000, verifySsl, ...restInit } = init || {};
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeout);

  return limit(() => (
    fetch(url, {
      ...restInit,
      signal: controller.signal,
      agent: verifySsl === false
        ? new https.Agent({
          rejectUnauthorized: false,
          secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT
        })
        : undefined
    })
      .catch(err => {
        if (err.name === 'AbortError') {
          throw new Error(`Timeout: ${url} took longer than ${timeout / 1000}s to respond.`);
        }
        throw err;
      })
      .finally(() => clearTimeout(timeoutHandle))
  ));
};
