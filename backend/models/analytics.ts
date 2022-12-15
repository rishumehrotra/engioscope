import { model, Schema } from 'mongoose';
import { UAParser } from 'ua-parser-js';

type Base = {
  userId: string;
  date: Date;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
};

export type PageView = Base & {
  type: 'page-view';
  path: string;
};

export type AnalyticsLogLine = PageView; // | other types

const discriminator = { discriminatorKey: 'type' };

const analyticsLogLineBaseSchema = new Schema<AnalyticsLogLine>({
  userId: { type: String, required: true },
  date: { type: Date, required: true },
  browser: { type: String, required: true },
  browserVersion: { type: String, required: true },
  os: { type: String, required: true },
  osVersion: { type: String, required: true }
}, { timestamps: false, ...discriminator });

const AnalyticsModel = model<AnalyticsLogLine>('AnalyticsLog', analyticsLogLineBaseSchema);

const pageViewSchema = new Schema<PageView>({
  path: { type: String, required: true }
}, { ...discriminator });

const PageViewModel = AnalyticsModel.discriminator('page-view', pageViewSchema);

const baseDetails = (userId: string, userAgent: string): Base => {
  const { browser, os } = UAParser(userAgent);

  return {
    userId,
    date: new Date(),
    browser: browser.name || 'unknown',
    browserVersion: browser.version || 'unknown',
    os: os.name || 'unknown',
    osVersion: os.version || 'unknown'
  };
};

export const recordPageView = (path: string, userId: string, userAgent: string) => (
  new PageViewModel({
    type: 'page-view',
    path,
    ...baseDetails(userId, userAgent)
  }).save()
);
