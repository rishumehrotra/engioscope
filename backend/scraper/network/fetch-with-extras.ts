import AbortController from 'abort-controller';
import type { RequestInfo, RequestInit } from 'node-fetch';
import fetch from 'node-fetch';
import https from 'node:https';
import pLimit from 'p-limit';
import { constants } from 'node:crypto';
import { HTTPError } from './http-error.js';

const limit = pLimit(35);

export default (
  url: RequestInfo,
  init?: RequestInit & { timeout?: number; verifySsl: boolean }
) => {
  const { timeout = 60_000, verifySsl, ...restInit } = init || {};
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeout);

  return limit(() =>
    fetch(url, {
      ...restInit,
      signal: controller.signal,
      agent:
        verifySsl === false
          ? new https.Agent({
              rejectUnauthorized: false,
              secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT,
            })
          : undefined,
    })
      .catch(error => {
        if (error.name === 'AbortError') {
          throw new Error(
            `Timeout: ${url} took longer than ${timeout / 1000}s to respond.`
          );
        }
        throw error;
      })
      .then(res => {
        if (!res.ok) throw new HTTPError(res);
        return res;
      })
      .finally(() => clearTimeout(timeoutHandle))
  );
};
