import { model, Schema } from 'mongoose';
import { asc, byString } from 'sort-lib';

type CronStatus = {
  date: Date;
  name: string;
  status: 'succeeded' | 'failed';
};

const cronStatusSchema = new Schema<CronStatus>(
  {
    date: { type: Date, required: true },
    status: { type: String, required: true },
    name: { type: String, required: true },
  },
  { capped: { max: 5000, size: 100_000 } }
);

cronStatusSchema.index({
  date: -1,
  name: 1,
});

const CronStatusModel = model<CronStatus>('CronStatus', cronStatusSchema);

export const appendCronLog = (name: string, status: CronStatus['status']) => {
  return CronStatusModel.create({
    name,
    date: new Date(),
    status,
  });
};

const cronDefs = new Map<string, string>();

export const registerCron = (name: string, timePattern: string) => {
  cronDefs.set(name, timePattern);
};

export const getCronStatusOverview = async () => {
  const cronStatuses = await CronStatusModel.aggregate<{
    _id: string;
    date: Date;
    status: CronStatus['status'];
  }>([
    {
      $group: {
        _id: '$name',
        date: { $first: '$date' },
        status: { $first: '$status' },
      },
    },
  ]);

  const byKey = new Map<string, { date: Date; status: CronStatus['status'] }>();
  cronStatuses.forEach(c => {
    byKey.set(c._id, { date: c.date, status: c.status });
  });

  return [...cronDefs.entries()].sort(asc(byString(x => x[0]))).map(([name, pattern]) => {
    return {
      name,
      pattern,
      date: byKey.get(name)?.date,
      status: byKey.get(name)?.status,
    };
  });
};
