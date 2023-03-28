/* eslint-disable import/no-extraneous-dependencies */
import mongoose from 'mongoose';
import { beforeEach, afterEach } from 'vitest';
import { setup, teardown } from 'vitest-mongodb';

beforeEach(async () => {
  await setup();
  // eslint-disable-next-line no-underscore-dangle
  await mongoose.connect(globalThis.__MONGO_URI__);
});

afterEach(async () => {
  await teardown();
  await mongoose.connection.close();
});
