/* eslint-disable import/no-extraneous-dependencies */
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { setup, teardown } from 'vitest-mongodb';

// eslint-disable-next-line no-underscore-dangle
declare let __MONGO_URI__: string;

export const needsDB = () => {
  beforeAll(async () => {
    await setup();

    await mongoose.connect(__MONGO_URI__);
  });

  afterAll(async () => {
    await teardown();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });
};
