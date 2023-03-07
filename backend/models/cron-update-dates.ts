import { model, Schema } from 'mongoose';

type CronUpdateDates = {
  key: string;
  date: Date;
};

const cronUpdateDatesSchema = new Schema<CronUpdateDates>({
  key: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
});

cronUpdateDatesSchema.index({ key: 1 });

export const CronUpdateDatesModel = model<CronUpdateDates>(
  'CronUpdateDates',
  cronUpdateDatesSchema
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createHandler = <T extends (...x: any[]) => string>(
  keyCreator: T
): [
  (...x: Parameters<T>) => Promise<Date | undefined>,
  (...x: Parameters<T>) => Promise<void>
] => [
  (...x) =>
    CronUpdateDatesModel.findOne({ key: keyCreator(...x) })
      .lean()
      .then(x => x?.date),
  (...x) =>
    CronUpdateDatesModel.updateOne(
      { key: keyCreator(...x) },
      { $set: { date: new Date() } },
      { upsert: true }
    )
      .lean()
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .then(() => {}),
];

export const [getWorkItemUpdateDate, setWorkItemUpdateDate] = createHandler(
  (collection: string) => `${collection}:work-items`
);

export const [getLastBuildUpdateDate, setLastBuildUpdateDate] = createHandler(
  (collection: string, project: string) => `${collection}:${project}:builds`
);

export const [getLastReleaseFetchDate, setLastReleaseFetchDate] = createHandler(
  (collection: string, project: string) => `${collection}:${project}:releases`
);

export const [getLastTestRunDate, setLastTestRunDate] = createHandler(
  (collection: string, project: string) => `${collection}:${project}:test-runs`
);
