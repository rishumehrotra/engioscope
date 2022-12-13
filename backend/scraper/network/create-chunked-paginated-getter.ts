import qs from 'qs';
import fetch from './fetch-with-extras.js';
import type { FetchResponse } from './fetch-with-disk-cache.js';
import fetchWithDiskCache from './fetch-with-disk-cache.js';

type PaginatedGetRequest<T> = {
  cacheFile: (pageIndex: string) => string[];
  url: string;
  headers: (previousResponse?: FetchResponse<T>) => Record<string, string>;
  hasAnotherPage: (previousResponse: FetchResponse<T>) => boolean;
  qsParams: (pageIndex: number, previousResponse?: FetchResponse<T>) => Record<string, string>;
  chunkHandler: (chunk: FetchResponse<T>) => Promise<unknown>;
};

export default (diskCacheTimeMs: number, verifySsl: boolean, requestTimeout?: number) => {
  const { usingDiskCache } = fetchWithDiskCache(diskCacheTimeMs);

  return async <T>({
    url, qsParams, cacheFile, headers, hasAnotherPage, chunkHandler
  }: PaginatedGetRequest<T>) => {
    let pageIndex = 1;
    let lastResponse = await usingDiskCache<T>(cacheFile('0'), () => (
      fetch(`${url}?${qs.stringify(qsParams(0))}`, {
        headers: headers ? headers() : {},
        verifySsl,
        timeout: requestTimeout
      })
    ));

    await chunkHandler(lastResponse);

    while (hasAnotherPage(lastResponse)) {
      // eslint-disable-next-line no-await-in-loop
      lastResponse = await usingDiskCache<T>(
        cacheFile(pageIndex.toString()),
        // eslint-disable-next-line no-loop-func
        () => fetch(`${url}?${qs.stringify(qsParams(pageIndex, lastResponse))}`, {
          headers: headers ? headers(lastResponse) : {},
          timeout: requestTimeout,
          verifySsl
        })
      );

      pageIndex += 1;

      // eslint-disable-next-line no-await-in-loop
      await chunkHandler(lastResponse);
    }
  };
};
