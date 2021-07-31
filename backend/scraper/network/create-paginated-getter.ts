import qs from 'qs';
import fetch from './fetch-with-timeout';
import { Config } from '../types';
import fetchWithDiskCache, { FetchResponse } from './fetch-with-disk-cache';

type PaginatedGetRequest<T> = {
  cacheFile: (pageIndex: string) => string[];
  url: string;
  headers: (previousResponse?: FetchResponse<T>) => Record<string, string>;
  hasAnotherPage: (previousResponse: FetchResponse<T>) => boolean;
  qsParams: (pageIndex: number, previousResponse?: FetchResponse<T>) => Record<string, string>;
};

export default (config: Config) => {
  const { usingDiskCache } = fetchWithDiskCache(config);

  return async <T>({
    url, qsParams, cacheFile, headers, hasAnotherPage
  }: PaginatedGetRequest<T>) => {
    const responses = [
      await usingDiskCache<T>(cacheFile('0'), () => (
        fetch(`${url}?${qs.stringify(qsParams(0))}`, {
          headers: headers ? headers() : {}
        })
      ))
    ];

    while (hasAnotherPage(responses[responses.length - 1])) {
      const previousResponse = responses[responses.length - 1];
      responses.push(
        // eslint-disable-next-line no-await-in-loop
        await usingDiskCache<T>(
          cacheFile(responses.length.toString()),
          () => fetch(`${url}?${qs.stringify(qsParams(responses.length, previousResponse))}`, {
            headers: headers ? headers(previousResponse) : {}
          })
        )
      );
    }

    return responses;
  };
};
