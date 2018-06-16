import { NgModule }         from '@angular/core';
import { BrowserModule }    from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgbModule }        from '@ng-bootstrap/ng-bootstrap';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent }     from './app.component';
import { BenchmarkDetailComponent }     from './benchmark-detail/benchmark-detail.component';
import { BenchmarkService } from './services/benchmark';
import { DashboardComponent }     from './dashboard/dashboard.component';
import { Phase1Component } from './benchmark-detail/phase-1/phase-1.component';
import { Phase2Component } from './benchmark-detail/phase-2/phase-2.component';

@NgModule({
  declarations: [
    AppComponent,
    BenchmarkDetailComponent,
    DashboardComponent,
    Phase1Component,
    Phase2Component
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    NgbModule.forRoot()
  ],
  providers: [ BenchmarkService ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
