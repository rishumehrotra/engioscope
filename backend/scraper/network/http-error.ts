import type { Response } from 'node-fetch';

export class HTTPError extends Error {
  status: number;

  constructor(res: Response) {
    super(res.statusText);
    this.name = 'HTTPError';
    this.status = res.status;

    // eslint-disable-next-line @typescript-eslint/no-floating-promises, no-console
    res.text().then(console.log);
  }
}

const isStatusCode =
  (statusCode: number) =>
  (error: unknown): error is HTTPError => {
    return error instanceof HTTPError && error.status === statusCode;
  };

export const is404 = isStatusCode(404);
