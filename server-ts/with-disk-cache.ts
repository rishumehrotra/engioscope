import { join } from 'path';
import { promises as fs } from 'fs';
import { and } from 'ramda';
import ms from 'ms';
import debug from 'debug';
import config from './config';

const logDiskIO = debug('disk-io');
const logNetworkIO = debug('network-io');
const cachePath = join(__dirname, 'cache');
const createCachePath = fs.mkdir(cachePath, { recursive: true });

const isCacheValid = async () => {
  try {
    const lastFetchDate = await fs.readFile(join(cachePath, 'last-fetch-date.txt'), 'utf8');
    return new Date(lastFetchDate).getTime() - ms(config.cacheToDiskFor) > 0;
  } catch (e) {
    return false;
  }
};

const fileExists = async (fileName: string) => {
  try {
    await fs.access(fileName);
    return true;
  } catch (e) {
    return false;
  }
};

const looksLikeDate = (value: string) => (
  /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/.test(value)
);

const parseDate = (_: string, value: unknown) => {
  if (typeof value !== 'string') return value;
  if (!looksLikeDate(value)) return value;
  return new Date(value);
};

export default async <T>(pathParts: string[], fn: () => Promise<T>) => {
  await createCachePath;
  const fileName = join(cachePath, `${pathParts.join('-')}.json`);

  const canUseCache = and(...await Promise.all([
    isCacheValid(), fileExists(fileName)
  ]));

  if (canUseCache) {
    logDiskIO(fileName);
    const contents = await fs.readFile(fileName, 'utf8');
    return JSON.parse(contents, parseDate) as T;
  }

  logNetworkIO(pathParts.join(' '));
  const result = await fn();
  await Promise.all([
    fs.writeFile(fileName, JSON.stringify(result), 'utf8'),
    fs.writeFile(join(cachePath, 'last-fetch-date.txt'), new Date().toISOString(), 'utf8')
  ]);
  return result;
};
