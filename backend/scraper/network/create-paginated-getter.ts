import qs from 'qs';
import { last } from 'rambda';
import fetch from './fetch-with-extras.js';
import type { FetchResponse } from './fetch-with-disk-cache.js';
import fetchWithDiskCache from './fetch-with-disk-cache.js';

type PaginatedGetRequest<T> = {
  cacheFile: (pageIndex: string) => string[];
  url: string;
  headers: (previousResponse?: FetchResponse<T>) => Record<string, string>;
  hasAnotherPage: (previousResponse: FetchResponse<T>) => boolean;
  qsParams: (
    pageIndex: number,
    previousResponse?: FetchResponse<T>
  ) => Record<string, string>;
};

export default (diskCacheTimeMs: number, verifySsl: boolean, requestTimeout?: number) => {
  const { usingDiskCache } = fetchWithDiskCache(diskCacheTimeMs);

  return async <T>({
    url,
    qsParams,
    cacheFile,
    headers,
    hasAnotherPage,
  }: PaginatedGetRequest<T>) => {
    const responses = [
      await usingDiskCache<T>(cacheFile('0'), () =>
        fetch(`${url}?${qs.stringify(qsParams(0))}`, {
          headers: headers ? headers() : {},
          verifySsl,
          timeout: requestTimeout,
        })
      ),
    ];

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    while (hasAnotherPage(last(responses)!)) {
      const previousResponse = last(responses);
      responses.push(
        // eslint-disable-next-line no-await-in-loop
        await usingDiskCache<T>(cacheFile(responses.length.toString()), () =>
          fetch(`${url}?${qs.stringify(qsParams(responses.length, previousResponse))}`, {
            headers: headers ? headers(previousResponse) : {},
            timeout: requestTimeout,
            verifySsl,
          })
        )
      );
    }

    return responses;
  };
};
