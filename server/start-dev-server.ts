import startServer from './express';
// Following line ts-ignore'd so that it can work in the CI pipeline
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import config from '../config.json';
import { Config } from './types';

startServer(config as unknown as Config);
