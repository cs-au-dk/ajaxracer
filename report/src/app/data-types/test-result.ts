export interface TestResult {
  userEventListener1: number;
  userEventListener2: number;

  actual: TestData;
  expected: TestData;

  succeeded: boolean;
  pixelIgnored: boolean;
}

export function GetTestResultId(testResult: TestResult) {
  return testResult.userEventListener1 + '-' + testResult.userEventListener2;
}

export interface TestData {
  numPostponedEvents: number;
  screenshotURL: string;
}
