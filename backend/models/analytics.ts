import { model, Schema } from 'mongoose';
import { byNum, desc } from 'sort-lib';
import { UAParser } from 'ua-parser-js';
import { oneYearInMs } from '../../shared/utils.js';
import { unique } from '../utils.js';

type Base = {
  userId?: string;
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
  userId: { type: String },
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

pageViewSchema.index({ date: 1 });

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

export const getAnalyticsGroups = () => {
  const now = new Date();

  return Promise.all([
    {
      label: 'Today',
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    },
    {
      label: 'Yesterday',
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate())
    },
    {
      label: 'Last 7 days',
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    },
    {
      label: 'Last 30 days',
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    }
  ].map(async group => (
    AnalyticsModel
      .aggregate<{ _id: string; pageViews: number; uniques: number; userIds: string[]}>([
        {
          $match: {
            $and: [
              { date: { $gt: group.start } }, { date: { $lt: group.end } }
            ],
            type: 'page-view'
          }
        },
        {
          $group: { // by path and userid
            _id: { path: '$path', userId: '$userId' },
            dates: { $addToSet: '$date' }
          }
        },
        {
          $group: { // back to path, but retain userId
            _id: '$_id.path',
            hits: {
              $push: {
                userId: '$_id.userId',
                minDate: { $min: '$dates' },
                maxDate: { $max: '$dates' },
                count: { $size: '$dates' }
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            pageViews: { $sum: '$hits.count' },
            uniques: { $size: '$hits' },
            userIds: '$hits.userId'
          }
        }
      ])
      .then(async lines => {
        const userIds = unique(lines.flatMap(line => line.userIds)).filter(Boolean);

        const returning = await AnalyticsModel
          .aggregate([
            {
              $match: {
                userId: { $in: userIds },
                $and: [
                  { date: { $lt: group.end } },
                  { date: { $gt: new Date(group.end.getTime() - oneYearInMs) } }
                ]
              }
            },
            {
              $group: {
                _id: '$userId',
                minDate: { $min: '$date' },
                maxDate: { $max: '$date' }
              }
            },
            {
              $addFields: {
                diff: {
                  $dateDiff: {
                    startDate: '$minDate',
                    endDate: '$maxDate',
                    unit: 'hour'
                  }
                }
              }
            },
            { $match: { diff: { $gte: 6 } } },
            { $group: { _id: null, count: { $sum: 1 } } }
          ])
          .then(result => result[0]?.count || 0);

        return {
          label: group.label,
          pageViews: lines.reduce((acc, line) => acc + line.pageViews, 0),
          uniques: userIds.length,
          returning,
          pages: lines
            .sort(desc(byNum(l => l.pageViews)))
            .slice(0, 20)
            .map(line => ({
              path: line._id,
              pageViews: line.pageViews,
              uniques: line.uniques
            }))
        };
      })
  )));
};

// eslint-disable-next-line no-underscore-dangle
export const __AnalyticsModelDONOTUSE = AnalyticsModel;
