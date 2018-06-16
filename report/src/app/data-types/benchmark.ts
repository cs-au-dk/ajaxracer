import { TestResult } from './test-result';
import { UserEventListener } from './user-event-listener';

export interface Benchmark {
  id: string;
  runId: string;
  url: string;
  observationModeSummary: ObservationModeSummary;
  testResults: TestResult[];

  numTests: number;
  numSucceedingTests: number;
  numSucceedingTestsWithIgnoredPixels: number;
  numFailingTests: number;
  numInfeasibleTests: number;
  numErroneousTests: number;

  timing: BenchmarkTimingData;
}

export interface BenchmarkTimingData {
  msAverageAdverseModeExecutionTime: number;
  msAverageLoadingTimePhase2: number;
  msAverageSynchronousModeExecutionTime: number;
  msLoadingTimePhase1: number;
  msLongestTestCase: number;
  msTraceGeneration: number;
  msTestPlanning: number;
  msReportGeneration: number;
  msReportGenerationPerTest: number;

  msPhase1WC: number;
  msPhase2ParallelWC: number;
  msPhase2SequentialWC: number;
}

export interface ObservationModeSummary {
  userEventListeners: UserEventListener[];
}
