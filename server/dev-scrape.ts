import scrape from './get-all-the-things';
import config from '../config.json';
import { Config } from './types';

scrape(config as unknown as Config);
