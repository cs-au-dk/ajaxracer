import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Benchmark } from '../../data-types/benchmark';
import { BenchmarkService } from '../../services/benchmark';
import { UserEventListener } from '../../data-types/user-event-listener';

@Component({
  selector: 'ajaxracer-phase-1',
  templateUrl: './phase-1.component.html',
  styleUrls: ['./phase-1.component.css']
})
export class Phase1Component implements OnInit {
  @Input() benchmark: Benchmark;

  hideSubtreesWithNoActions: boolean = false;

  selectedUserEventListener1: UserEventListener = null;
  selectedUserEventListener2: UserEventListener = null;

  constructor(
    private route: ActivatedRoute,
    private benchmarkService: BenchmarkService
  ) {}

  ngOnInit(): void {
    this.getBenchmark();
  }

  getBenchmark(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.benchmarkService.getBenchmark(id)
      .subscribe(benchmark => this.benchmark = benchmark);
  }

  getDescription(userEventListener: UserEventListener): string {
    if (userEventListener.description) {
      return userEventListener.description;
    }
    return userEventListener.type + ' [' + userEventListener.selector + ']';
  }

  getEventGraphURL(userEventListener: UserEventListener): string {
    if (this.hideSubtreesWithNoActions ||
        !userEventListener.eventGraphURLs.full) {
      return userEventListener.eventGraphURLs.actionsOnly;
    }
    return userEventListener.eventGraphURLs.full;
  }

  isHideSubtreesWithNoActionsEnabled(): boolean {
    return this.hideSubtreesWithNoActions;
  }

  isUserEventListenerSelected(userEventListener: UserEventListener): boolean {
    return this.selectedUserEventListener1 == userEventListener ||
           this.selectedUserEventListener2 == userEventListener;
  }

  toggleHideSubtreesWithNoActions(): void {
    this.hideSubtreesWithNoActions = !this.hideSubtreesWithNoActions;
  }

  toggleUserEventListener(userEventListener: UserEventListener): void {
    if (this.selectedUserEventListener1 == userEventListener) {
      this.selectedUserEventListener1 = this.selectedUserEventListener2;
      this.selectedUserEventListener2 = null;
    } else if (this.selectedUserEventListener2 == userEventListener) {
      this.selectedUserEventListener2 = null;
    } else if (this.selectedUserEventListener1 == null) {
      this.selectedUserEventListener1 = userEventListener;
    } else {
      this.selectedUserEventListener2 = userEventListener;
    }
  }
}
