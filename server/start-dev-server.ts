import startServer from './express';
import config from '../config.json';
import { Config } from './types';

startServer(config as unknown as Config);
