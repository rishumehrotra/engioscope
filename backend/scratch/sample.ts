/* eslint-disable no-console */
import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { getConfig, setConfig } from '../config.js';
import parseConfig from '../scraper/parse-config.js';

setConfig(parseConfig(JSON.parse(readFileSync('./config.json', 'utf8'))));

mongoose.set('strictQuery', false);
await mongoose.connect(getConfig().mongoUrl);

console.time('Time');

// *** Your code here

console.timeEnd('Time');

// eslint-disable-next-line unicorn/no-process-exit
process.exit();
