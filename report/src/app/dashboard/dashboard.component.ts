import { Component, OnInit } from '@angular/core';

import { Benchmark } from '../data-types/benchmark';
import { BenchmarkService } from '../services/benchmark';
import { TestResult } from '../data-types/test-result';

@Component({
  selector: 'ajaxracer-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  alternative: Benchmark[] = [];
  benchmarks: Benchmark[] = [];

  constructor(
    private benchmarkService: BenchmarkService
  ) {}

  ngOnInit(): void {
    this.getBenchmarks();
  }

  getBenchmarks(): void {
    this.benchmarkService.getBenchmarks().subscribe(benchmarks => {
      /*benchmarks.forEach((benchmark) => {
        var id = benchmark.id;
        var shouldAugmentId = false;
        var lastDashPos = benchmark.id.lastIndexOf('-');
        if (lastDashPos > 0) {
          var remainder = benchmark.id.substring(lastDashPos + 1);
          console.log('isnan?', remainder, isNaN(Number(remainder)))
          if (!isNaN(Number(remainder))) {
            shouldAugmentId = true;
          }
        } else {
          shouldAugmentId = true;
        }
        if (shouldAugmentId) {
          var i = 1;
          var newId;
          var otherBenchmarkHasSameId;
          do {
            newId = id + '-' + i;
            otherBenchmarkHasSameId = benchmarks.some(
              (other) => other != benchmark && other.id == newId);
            i++;
          } while (otherBenchmarkHasSameId);
          benchmark.id = newId;
          console.log('new id', benchmark.id)
        }
      });*/
      benchmarks.sort(function (a, b) {
        return (a.id < b.id) ? -1 : (a.id === b.id ? 0 : 1);
      });
      this.alternative = benchmarks;
      this.benchmarks =
        benchmarks.map((benchmark) => JSON.parse(JSON.stringify(benchmark)))
                  .filter(function (benchmark, i) {
          var lastDashPos = benchmark.id.lastIndexOf('-');
          if (lastDashPos < 0) {
            return true;
          }

          var remainder = benchmark.id.substring(lastDashPos + 1);
          if (remainder.length > 0 && !isNaN(Number(remainder))) {
            var performanceIndex = parseInt(remainder);
            if (performanceIndex !== 1) {
              return false;
            }

            // Remove '-1' from run id.
            benchmark.id = benchmark.id.substring(0, lastDashPos);

            // Update running times.
            var timing = {
              msAverageAdverseModeExecutionTime: 0,
              msAverageLoadingTimePhase2: 0,
              msAverageSynchronousModeExecutionTime: 0,
              msLoadingTimePhase1: 0,
              msTraceGeneration: 0,
              msTestPlanning: 0,
              msReportGeneration: 0,
              msReportGenerationPerTest: 0,
              msPhase1WC: 0,
              msPhase2ParallelWC: 0,
              msPhase2SequentialWC: 0,
              msTestPlanningWC: 0
            };

            var timings = [];
            while (i < benchmarks.length &&
                   benchmarks[i].id.indexOf(benchmark.id) === 0) {
              timings.push(benchmarks[i].timing);
              ++i;
            }

            timings.forEach((other) => {
              timing.msAverageAdverseModeExecutionTime +=
                other.msAverageAdverseModeExecutionTime;
              timing.msAverageLoadingTimePhase2 +=
                other.msAverageLoadingTimePhase2;
              timing.msAverageSynchronousModeExecutionTime +=
                other.msAverageSynchronousModeExecutionTime;
              timing.msLoadingTimePhase1 += other.msLoadingTimePhase1;
              timing.msTraceGeneration += other.msTraceGeneration;
              timing.msTestPlanning += other.msTestPlanning;
              timing.msReportGeneration += other.msReportGeneration;
              timing.msReportGenerationPerTest += other.msReportGenerationPerTest;

              var msPhase1 = other.msLoadingTimePhase1 + other.msTraceGeneration;
              var msPhase2Parallel = other.msLongestTestCase +
                                     other.msReportGenerationPerTest;
              var msPhase2Sequential =
                other.msReportGeneration + benchmark.numTests * (
                  2 * other.msAverageLoadingTimePhase2 +
                  other.msAverageAdverseModeExecutionTime +
                  other.msAverageSynchronousModeExecutionTime);

              timing.msPhase1WC = Math.max(timing.msPhase1WC, msPhase1);
              timing.msPhase2ParallelWC =
                Math.max(timing.msPhase2ParallelWC, msPhase2Parallel);
              timing.msPhase2SequentialWC =
                Math.max(timing.msPhase2SequentialWC, msPhase2Sequential);
              timing.msTestPlanningWC = Math.max(timing.msTestPlanningWC,
                                                 other.msTestPlanning);
            });

            timing.msAverageAdverseModeExecutionTime /= timings.length;
            timing.msAverageLoadingTimePhase2 /= timings.length;
            timing.msAverageSynchronousModeExecutionTime /= timings.length;
            timing.msLoadingTimePhase1 /= timings.length;
            timing.msTraceGeneration /= timings.length;
            timing.msTestPlanning /= timings.length;
            timing.msReportGeneration /= timings.length;
            timing.msReportGenerationPerTest /= timings.length;

            benchmark.timing = timing;

            return true;
          }
        });

        this.toggleCollapse();
    });
  }

  formatAverage(average: number): string {
    if (average === null) {
      return '-';
    }

    return String(Math.round(average * 10) / 10);
  }

  formatTime(time: number, decimal = 0): string {
    if (time === null) {
      return '-';
    }

    var minutes = Math.floor(time / (60 * 1000));
    if (minutes > 0) {
      var remaining = time - 60 * 1000 * minutes;
      var seconds = decimal ? Math.round(remaining / 100) / 10
                            : Math.round(remaining / 1000);
      return String(minutes) + 'm ' + String(seconds) + 's';
    }

    var seconds = decimal ? Math.round(time / 100) / 10
                          : Math.round(time / 1000);
    return String(seconds) + 's';
  }

  getNumAverageTests(): number {
    if (this.benchmarks.length === 0) {
      return 0;
    }

    var sum = 0;
    this.benchmarks.forEach((benchmark) => sum += benchmark.numTests);
    return sum / this.benchmarks.length;
  }

  getTestData(id: string, average = true): number {
    // Compute over all benchmarks.
    var result = 0;
    this.benchmarks.forEach((benchmark) => {
      result += benchmark[id];
    });
    if (average) {
      result = result / this.benchmarks.length;
    }
    return result;
  }

  getTimingData(benchmark: Benchmark, ids: string[], multiplyByAverageNumberOfTests = false, average = true): number {
    if (benchmark === null) {
      // Compute over all benchmarks.
      var benchmarks = this.benchmarks.filter(
        (benchmark) => this.getTimingData(benchmark, ids));
      if (benchmarks.length === 0) {
        return null;
      }

      var timings =
        benchmarks.map((benchmark) => this.getTimingData(benchmark, ids));

      var sum = 0;
      timings.forEach((timing) => sum += timing);

      var result = sum;
      if (average) {
        result = result / benchmarks.length
      }
      if (multiplyByAverageNumberOfTests) {
        var totalNumberOfTests = 0;
        benchmarks.forEach(
          (benchmark) => totalNumberOfTests += benchmark.numTests);
        result *= totalNumberOfTests / benchmarks.length;
      }
      return result;
    }

    if (ids.some((id) => !(id in benchmark.timing))) {
      return null;
    }

    var sum: number = 0;
    ids.forEach((id) => sum += benchmark.timing[id]);
    return sum;
  }

  toggleCollapse(): void {
    // Swap `alternative` and `benchmarks`.
    var tmp = this.alternative;
    this.alternative = this.benchmarks;
    this.benchmarks = tmp;
  }
}
