import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Benchmark } from '../../data-types/benchmark';
import { BenchmarkService } from '../../services/benchmark';
import { TestResult, GetTestResultId } from '../../data-types/test-result';
import { UserEventListener } from '../../data-types/user-event-listener';

@Component({
  selector: 'ajaxracer-phase-2',
  templateUrl: './phase-2.component.html',
  styleUrls: ['./phase-2.component.css']
})
export class Phase2Component implements OnInit {
  @Input() benchmark: Benchmark = null;
  selectedTestResult: TestResult = null;
  selectedTestResultViews: Map<TestResult, string> = new Map();
  selectedTabs: Map<TestResult, Map<string, string>> = new Map();

  constructor(
    private route: ActivatedRoute,
    private benchmarkService: BenchmarkService
  ) {}

  ngOnInit(): void {
    this.getBenchmark();
  }

  getBenchmark(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.benchmarkService.getBenchmark(id).subscribe(benchmark => {
      this.benchmark = benchmark;
      this.benchmark.testResults.forEach(
        (testResult) => {
          this.selectView(testResult, 'event-graphs');
          this.selectTab(testResult, 'actual', 'third');
          this.selectTab(testResult, 'expected', 'third');
        }
      );

      var testId = this.route.snapshot.paramMap.get('testId');
      if (testId) {
        this.selectedTestResult = this.benchmark.testResults.find(
          (testResult) => GetTestResultId(testResult) == testId);

        var pageId = this.route.snapshot.paramMap.get('pageId');
        this.selectView(this.selectedTestResult, pageId);

        var tabId = this.route.snapshot.paramMap.get('tabId');
        if (tabId) {
          this.selectTab(this.selectedTestResult, pageId, tabId);
        }
      }
    });
  }

  getDescription(userEventListenerId: number): string {
    var userEventListener: UserEventListener =
      this.getUserEventListener(userEventListenerId);
    if (userEventListener.description) {
      return userEventListener.description;
    }
    return userEventListener.type + ' [' + userEventListener.selector + ']';
  }

  getNumPostponedEvents(testResult: TestResult): string {
    if (testResult.actual &&
        typeof testResult.actual.numPostponedEvents === 'number') {
      return String(testResult.actual.numPostponedEvents);
    }
    return '-';
  }

  getRouteFor(testResult: TestResult, pageId: string, tabId: string): string {
    var testResultId = GetTestResultId(testResult);

    var route =
      '/benchmark/' + this.benchmark.id + '/phase-2/' + testResultId +
      '/' + pageId;
    if (tabId) {
      route += '/' + tabId;
    }
    return route;
  }

  getSelectedTab(testResult: TestResult, page: string): string {
    if (!this.selectedTabs.has(testResult)) {
      this.selectedTabs.set(testResult, new Map());
    }
    return this.selectedTabs.get(testResult).get(page);
  }

  getTests(): TestResult[] {
    if (this.benchmark !== null) {
      return this.benchmark.testResults;
    }
    return [];
  }

  getTestFailures(): TestResult[] {
    if (this.benchmark !== null) {
      return this.benchmark.testResults.filter(
        (testResult) => testResult.succeeded === false);
    }
    return [];
  }

  getUserEventListener(id: number): UserEventListener {
    return this.benchmark.observationModeSummary.userEventListeners[id];
  }

  getView(testResult: TestResult): string {
    return this.selectedTestResultViews.get(testResult);
  }

  isOtherTestResultSelected(testResult: TestResult): boolean {
    return this.selectedTestResult !== null &&
           this.selectedTestResult !== testResult;
  }

  isTestResultSelected(testResult: TestResult): boolean {
    return this.selectedTestResult == testResult;
  }

  selectTab(testResult: TestResult, page: string, tab: string): void {
    if (!this.selectedTabs.has(testResult)) {
      this.selectedTabs.set(testResult, new Map());
    }
    this.selectedTabs.get(testResult).set(page, tab);
  }

  selectView(testResult: TestResult, view: string): void {
    this.selectedTestResultViews.set(testResult, view);
  }

  toggleTestResult(testResult: TestResult): void {
    if (this.selectedTestResult === testResult) {
      this.selectedTestResult = null;
    } else {
      this.selectedTestResult = testResult;
    }
  }
}
