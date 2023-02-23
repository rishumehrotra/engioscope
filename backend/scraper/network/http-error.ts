import type { Response } from 'node-fetch';

export class HTTPError extends Error {
  status: number;

  constructor(res: Response, ...x: unknown[]) {
    super(res.statusText);
    this.name = 'HTTPError';
    this.status = res.status;

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    res.text().then(text => {
      const message = JSON.stringify([...x, text]);
      // eslint-disable-next-line no-console
      console.error(message);
      this.message = message;
    });
  }
}

const isStatusCode =
  (statusCode: number) =>
  (error: unknown): error is HTTPError => {
    return error instanceof HTTPError && error.status === statusCode;
  };

export const is404 = isStatusCode(404);
