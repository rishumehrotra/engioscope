import React, { useEffect, useState } from 'react';
import type { UIChangeProgram } from '../../shared/types';
import ByTeam from '../components/change-program/ByTeam';
import ByTheme from '../components/change-program/ByTheme';
import Switcher from '../components/common/Switcher';
import Header from '../components/Header';
import Loading from '../components/Loading';
import { shortDate } from '../helpers/utils';
import useQueryParam, { asString } from '../hooks/use-query-param';
import { changeProgramDetails } from '../network';

const threeMonthsAgo = (date: string) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() - 3);
  return d;
};

const ChangeProgram: React.FC = () => {
  const [changeProgram, setChangeProgram] = useState<UIChangeProgram | null>(null);
  useEffect(() => { changeProgramDetails().then(setChangeProgram); }, []);
  const [show, setShow] = useQueryParam('show', asString);

  return (
    <>
      <Header
        title={changeProgram?.details?.name || 'Change program'}
        lastUpdated={changeProgram ? new Date(changeProgram.lastUpdateDate) : null}
      />
      <div className="mx-32">
        {!changeProgram
          ? <Loading />
          : (
            <div className="mt-8 bg-gray-50">
              {!changeProgram.details
                ? 'Change program not configured'
                : (
                  <>
                    <div className="mt-8 bg-gray-50 grid grid-cols-2">
                      <div>
                        <strong className="font-semibold">
                          Reporting period:
                        </strong>
                        {` From ${
                          shortDate(threeMonthsAgo(changeProgram.lastUpdateDate))
                        } to ${shortDate(new Date(changeProgram.lastUpdateDate))}.`}
                      </div>
                      <div className="text-right justify-self-end">
                        <div className="flex items-center">
                          <span className="inline-block pr-2 uppercase text-xs font-semibold">View by</span>
                          <Switcher
                            options={[
                              { label: 'Teams', value: 'teams' },
                              { label: 'Themes', value: 'theme' }
                            ]}
                            onChange={value => setShow(value === 'teams' ? undefined : value, true)}
                            value={show === undefined ? 'teams' : show}
                          />
                        </div>
                      </div>
                    </div>
                    {show
                      ? (
                        <ByTheme changeProgramDetails={changeProgram.details} />
                      )
                      : (
                        <ByTeam changeProgramDetails={changeProgram.details} />
                      )}
                  </>
                )}
            </div>
          )}
      </div>
    </>
  );
};

export default ChangeProgram;
