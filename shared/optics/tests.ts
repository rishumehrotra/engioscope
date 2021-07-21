import { lens } from '@rakeshpai/lens.ts';
import { applySpec, map, pipe } from 'rambda';

export type OTWBuildPipeline = [
  name: string,
  definitionId: number,
  successfulTests: number,
  failedTests: number,
  executionTime: string,
  coverage: string
];

export type UIBuildPipeline = {
  name: string;
  definitionId: number;
  successfulTests: number;
  failedTests: number;
  executionTime: string;
  coverage: string;
}

export type OTWTests = [
  total: number,
  pipelines: OTWBuildPipeline[]
];

export type UITests = {
  total: number;
  pipelines: UIBuildPipeline[];
};

const testsLens = lens<OTWTests>();

const totalLens = testsLens[0];
const pipelinesLens = testsLens[1];

const pipelineLens = lens<OTWBuildPipeline>();
const pipelineNameLens = pipelineLens[0];
const pipelineDefinitionIdLens = pipelineLens[1];
const pipelineSuccessfulTestsLens = pipelineLens[2];
const pipelineFailedTestsLens = pipelineLens[3];
const pipelineExecutionTimeLens = pipelineLens[4];
const pipelineCoverageLens = pipelineLens[5];

const viewPipeline = (pipeline: OTWBuildPipeline) => applySpec<UIBuildPipeline>({
  name: pipelineNameLens.get(),
  definitionId: pipelineDefinitionIdLens.get(),
  successfulTests: pipelineSuccessfulTestsLens.get(),
  failedTests: pipelineFailedTestsLens.get(),
  executionTime: pipelineExecutionTimeLens.get(),
  coverage: pipelineCoverageLens.get()
})(pipeline);

const setPipeline = (pipeline: UIBuildPipeline) => pipe(
  pipelineNameLens.set(pipeline.name),
  pipelineDefinitionIdLens.set(pipeline.definitionId),
  pipelineSuccessfulTestsLens.set(pipeline.successfulTests),
  pipelineFailedTestsLens.set(pipeline.failedTests),
  pipelineExecutionTimeLens.set(pipeline.executionTime),
  pipelineCoverageLens.set(pipeline.coverage)
);

export const viewTests = (tests: OTWTests) => applySpec<UITests>({
  total: totalLens.get(),
  pipelines: pipelinesLens.get(map(viewPipeline))
})(tests);

export const setTests = (tests: UITests) => pipe(
  totalLens.set(tests.total),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pipelinesLens.set(_ => tests.pipelines.map(
    t => setPipeline(t)([] as unknown as OTWBuildPipeline)
  ))
);
