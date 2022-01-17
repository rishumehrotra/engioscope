import React from 'react';
import Loading from '../components/Loading';
import { num } from '../helpers/utils';
import useFetchForProject from '../hooks/use-fetch-for-project';
import { testCasesMetrics } from '../network';

const TestCases: React.FC = () => {
  const testCasesAnalysis = useFetchForProject(testCasesMetrics);

  if (testCasesAnalysis === 'loading') return <Loading />;

  const totalTestCases = testCasesAnalysis.testCases.automated.total
    + testCasesAnalysis.testCases.notAutomated.total;

  return (
    <>
      <div>
        Total test cases:
        {' '}
        {num(totalTestCases)}
      </div>
      <div>
        Automated:
        {' '}
        {num(testCasesAnalysis.testCases.automated.total)}
        {`${totalTestCases > 0 ? ` (${((testCasesAnalysis.testCases.automated.total / totalTestCases) * 100).toFixed(2)}%)` : ''}`}
      </div>
    </>
  );
};

export default TestCases;
