import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Loading from '../components/Loading.js';
import { num } from '../helpers/utils.js';
import useUIConfig from '../hooks/use-ui-config.js';
import { useSetHeaderDetails } from '../hooks/header-hooks.js';
import { trpc } from '../helpers/trpc.js';

const Analytics: React.FC = () => {
  const uiConfig = useUIConfig();
  // const [analytics, setAnalytics] = useState<AnalyticsItem[] | undefined>();
  const setHeaderDetails = useSetHeaderDetails();
  const analytics2 = trpc.analytics.getAnalyticsGroups.useQuery();

  // useEffect(() => {
  //   // TODO: Error handling
  //   // eslint-disable-next-line @typescript-eslint/no-floating-promises
  //   fetchAnalytics().then(setAnalytics);
  // }, []);
  useEffect(() => {
    setHeaderDetails({
      title: 'Analytics',
      lastUpdated: new Date().toISOString()
    });
  }, [setHeaderDetails, uiConfig]);

  return (
    <div className="mx-32 bg-gray-50 p-8 rounded-lg" style={{ marginTop: '-3.25rem' }}>
      {analytics2
        ? (
          <ul className="grid grid-flow-row gap-8 grid-col-1 grid-cols-2 auto-rows-auto">
            {analytics2.data?.map(({
              label, pageViews, uniques, pages, returning
            }) => (
              <li key={label} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                <h2 className="text-2xl mb-2 bg-gray-900 text-white py-4 px-6 shadow-sm">{label}</h2>
                <div className="flex flex-row gap-4 p-4">
                  <div className="text-2xl bg-gray-200 rounded-md p-2 px-3">
                    {num(pageViews)}
                    <div className="text-sm text-gray-600">Page views</div>
                  </div>
                  <div className="text-2xl bg-gray-200 rounded-md p-2 px-3">
                    {num(uniques)}
                    <div className="text-sm text-gray-600">Unique visitors</div>
                  </div>
                  <div className="text-2xl bg-gray-200 rounded-md p-2 px-3">
                    {num(returning)}
                    <div className="text-sm text-gray-600">Returning visitors</div>
                  </div>
                </div>
                <table className="m-4 break-all" style={{ width: 'calc(100% - 2rem)' }}>
                  <thead>
                    <tr>
                      <th> </th>
                      <th className="font-light text-xs uppercase text-right pr-3">Views</th>
                      <th className="font-light text-xs uppercase text-right pr-3">Uniques</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map(({ path, pageViews, uniques }, index) => (
                      <tr key={path} className={index % 2 === 0 ? '' : 'bg-gray-200'}>
                        <td className="p-1 px-3" width="75%">
                          <Link
                            to={path}
                            className="text-blue-600 hover:text-blue-800 inline-block text-sm truncate w-96"
                            title={path}
                          >
                            {path}
                          </Link>
                        </td>
                        <td className="p-1 px-3 text-right align-top text-sm text-gray-700" width="10%">
                          {num(pageViews)}
                        </td>
                        <td className="p-1 px-3 text-right align-top text-sm text-gray-700" width="10%">
                          {num(uniques)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </li>
            ))}
          </ul>
        )
        : <Loading />}
    </div>
  );
};

export default Analytics;
