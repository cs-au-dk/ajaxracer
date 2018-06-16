import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardComponent }   from "./dashboard/dashboard.component";
import { BenchmarkDetailComponent }   from "./benchmark-detail/benchmark-detail.component";

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'benchmark/:id', component: BenchmarkDetailComponent },
  { path: 'benchmark/:id/:phase', component: BenchmarkDetailComponent },
  { path: 'benchmark/:id/:phase/:testId', component: BenchmarkDetailComponent },
  { path: 'benchmark/:id/:phase/:testId/:pageId', component: BenchmarkDetailComponent },
  { path: 'benchmark/:id/:phase/:testId/:pageId/:tabId', component: BenchmarkDetailComponent }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes, { useHash: true }) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}
