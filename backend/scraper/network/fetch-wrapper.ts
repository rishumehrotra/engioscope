import type fetch from 'node-fetch';
import type { RequestInfo, RequestInit } from 'node-fetch';

// This uses the dynamic import hack to import the fetch module.
// https://github.com/node-fetch/node-fetch/issues/1279#issuecomment-915063354

// eslint-disable-next-line no-new-func
const dynamicImport = new Function('', 'return import("node-fetch")') as () => Promise<{ default: typeof fetch }>;

const fetchWrapper = (url: RequestInfo, init?: RequestInit) => (
  dynamicImport().then(({ default: fetch }) => fetch(url, init))
);

export default fetchWrapper;
