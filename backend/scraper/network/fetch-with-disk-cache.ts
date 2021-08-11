import { Response } from 'node-fetch';
import { createWriteStream, createReadStream, promises as fs } from 'fs';
import readline from 'readline';
import { pipeline } from 'stream';
import { promisify } from 'util';
import debug from 'debug';
import { join } from 'path';
import rimraf from '@zkochan/rimraf';
import { doesFileExist } from '../../utils';

const logFetch = debug('fetch');
const logNetwork = logFetch.extend('network-io');
const logDisk = logFetch.extend('disk-io');

const streamPipeline = promisify(pipeline);

type FileLocation = [dirName: string, fileName: string];
type Fetcher = () => Promise<Response>;

export type FrontMatter = {
  date: number;
  status: number;
  headers: { [k: string]: string };
};

export type FetchResponse<T> = FrontMatter & { fromCache: boolean; data: T };

const cacheLocation = join(process.cwd(), 'cache');

const cachePath = (pathParts: string[]): FileLocation => (
  pathParts.length === 0
    ? [cacheLocation, `${pathParts[0]}.txt`]
    : [join(cacheLocation, ...pathParts.slice(0, -1)), `${pathParts[pathParts.length - 1]}.txt`]
);
const fileNameForLogs = (fileName: string) => fileName.replace(`${process.cwd()}/`, '');

const getFirstLine = async (pathToFile: string) => {
  const readable = createReadStream(pathToFile);
  const reader = readline.createInterface({ input: readable });
  const line = await new Promise(resolve => {
    reader.on('line', line => {
      reader.close();
      resolve(line);
    });
  });
  readable.close();
  return line as string;
};

const getFrontMatter = async (filePath: string) => (
  JSON.parse(await getFirstLine(filePath)) as FrontMatter
);

const looksLikeDate = (value: string) => (
  /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(.*Z)/.test(value)
);

const parseDate = (_: string, value: unknown) => {
  if (typeof value !== 'string') return value;
  if (!looksLikeDate(value)) return value;
  return new Date(value);
};

const streamToDisk = async (fileLocation: FileLocation, fetcher: Fetcher) => {
  const response = await fetcher();
  const filePath = join(...fileLocation);

  if (!response.ok) {
    logNetwork(`HTTP error when fetching ${response.url} ${response.status} - ${response.statusText}`);
    logNetwork(await response.text());
    throw new Error(`HTTP error when fetching ${response.url}, statusText: ${response.status} - ${response.statusText}`);
  }

  logNetwork(`Status: ${response.status}. Streaming from ${response.url} to ${fileNameForLogs(filePath)}`);

  await fs.mkdir(fileLocation[0], { recursive: true });

  const fileStream = createWriteStream(filePath);
  fileStream.write(JSON.stringify({
    date: Date.now(),
    status: response.status,
    headers: Object.fromEntries(response.headers.entries())
  } as FrontMatter));
  fileStream.write('\n');
  await streamPipeline(response.body, fileStream);

  logDisk(`Wrote ${fileNameForLogs(filePath)}`);
};

export default (diskCacheTimeMs: number) => ({
  usingDiskCache: async <T>(pathParts: string[], fetcher: Fetcher): Promise<FetchResponse<T>> => {
    const fileLocation = cachePath(pathParts);
    const filePath = join(...fileLocation);
    let fromCache = false;

    if (!await doesFileExist(filePath)) {
      await streamToDisk(fileLocation, fetcher);
      fromCache = true;
    } else if (Date.now() - (await getFrontMatter(filePath)).date > diskCacheTimeMs) {
      fromCache = true;
      await streamToDisk(fileLocation, fetcher);
    }

    logDisk(`Reading ${fileNameForLogs(filePath)}`);
    const fileContents = await fs.readFile(filePath, 'utf-8');
    const [frontMatterString, dataString] = fileContents.split('\n');

    try {
      return {
        ...JSON.parse(frontMatterString) as FrontMatter,
        fromCache,
        data: JSON.parse(dataString, parseDate)
      };
    } catch (e) {
      await fs.unlink(filePath);
      throw e;
    }
  },
  clearDiskCache: async (pathParts: string[]) => {
    const possibleDirectory = join(cacheLocation, ...pathParts);

    if (
      await doesFileExist(possibleDirectory)
      && (await fs.stat(possibleDirectory)).isDirectory()
    ) {
      logDisk(`Deleting directory ${fileNameForLogs(possibleDirectory)}`);
      await rimraf(possibleDirectory);
    } else if (await doesFileExist(join(...cachePath(pathParts)))) {
      logDisk(`Deleting ${fileNameForLogs(join(...cachePath(pathParts)))}`);
      await fs.unlink(join(...cachePath(pathParts)));
    }
  }
});
