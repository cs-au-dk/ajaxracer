import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from 'rxjs/Observable';

import { Benchmark } from '../data-types/benchmark';

@Injectable()
export class BenchmarkService {
  cache: Map<string, any> = new Map();

  constructor(private http: HttpClient) {
  }

  getAbsoluteURL(path: string): string {
    return "data/" + path;
  }

  getBenchmarks(): Observable<Benchmark[]> {
    var url = this.getAbsoluteURL("benchmarks.json");
    if (this.cache.has(url)) {
      return Observable.create((observer) => {
        observer.next(this.cache.get(url))
        observer.complete();
      });
    }
    return this.http.get<Benchmark[]>(url);
  }

  getBenchmark(id: string): Observable<Benchmark> {
    var url = this.getAbsoluteURL("details/" + id + "/report.json");
    if (this.cache.has(url)) {
      return Observable.create((observer) => {
        observer.next(this.cache.get(url))
        observer.complete();
      });
    }
    return this.http.get<Benchmark>(url);
  }
}
