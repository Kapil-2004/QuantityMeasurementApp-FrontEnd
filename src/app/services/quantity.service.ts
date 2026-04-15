import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class QuantityService {
  private readonly API_URL = 'https://quantitymeasurementapp-ock1.onrender.com/api/quantities';

  constructor(private http: HttpClient) {}

  compare(q1: any, q2: any): Observable<any> {
    return this.http.post(`${this.API_URL}/compare`, { Q1: q1, Q2: q2 }).pipe(
      map((res: any) => res.data || res)
    );
  }

  convert(quantity: any, targetUnit: string): Observable<any> {
    return this.http.post(`${this.API_URL}/convert`, { Quantity: quantity, TargetUnit: targetUnit }).pipe(
      map((res: any) => res.data || res)
    );
  }

  add(q1: any, q2: any): Observable<any> {
    return this.http.post(`${this.API_URL}/add`, { Q1: q1, Q2: q2 }).pipe(
      map((res: any) => res.data || res)
    );
  }

  subtract(q1: any, q2: any): Observable<any> {
    return this.http.post(`${this.API_URL}/subtract`, { Q1: q1, Q2: q2 }).pipe(
      map((res: any) => res.data || res)
    );
  }

  divide(q1: any, q2: any): Observable<any> {
    return this.http.post(`${this.API_URL}/divide`, { Q1: q1, Q2: q2 }).pipe(
      map((res: any) => res.data || res)
    );
  }

  getHistory(): Observable<any[]> {
    return this.http.get(`${this.API_URL}/history`).pipe(
      map((res: any) => res.data || res || [])
    );
  }

  getCount(): Observable<any> {
    return this.http.get(`${this.API_URL}/count`).pipe(
      map((res: any) => res.data || res)
    );
  }
}
