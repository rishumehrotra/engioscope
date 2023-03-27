/* eslint-disable import/no-extraneous-dependencies */
import mongoose from 'mongoose';
// import { beforeAll, afterAll } from 'vitest';
import { beforeEach, afterEach } from 'vitest';
import { setup, teardown } from 'vitest-mongodb';

// beforeAll(async () => {
//   await setup();
//   // eslint-disable-next-line no-underscore-dangle
//   await mongoose.connect(globalThis.__MONGO_URI__);
// });

// afterAll(async () => {
//   await teardown();
//   await mongoose.connection.close();
// });

beforeEach(async () => {
  await setup();
  // eslint-disable-next-line no-underscore-dangle
  await mongoose.connect(globalThis.__MONGO_URI__);
});

afterEach(async () => {
  await teardown();
  await mongoose.connection.close();
});
