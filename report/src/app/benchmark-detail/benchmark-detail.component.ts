import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Benchmark } from '../data-types/benchmark';
import { BenchmarkService } from '../services/benchmark';

@Component({
  selector: 'ajaxracer-benchmark-detail',
  templateUrl: './benchmark-detail.component.html',
  styleUrls: ['./benchmark-detail.component.css']
})
export class BenchmarkDetailComponent implements OnInit {
  @Input() benchmark: Benchmark;
  selectedPhase: String;

  constructor(
    private route: ActivatedRoute,
    private benchmarkService: BenchmarkService
  ) {}

  ngOnInit(): void {
    this.getBenchmark();
    this.selectedPhase = this.route.snapshot.paramMap.get('phase');
  }

  getBenchmark(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.benchmarkService.getBenchmark(id)
      .subscribe(benchmark => this.benchmark = benchmark);
  }

  selectPhase(phase: String): void {
    this.selectedPhase = phase;
  }
}
