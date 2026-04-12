import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  private activeTypeSubject = new BehaviorSubject<string>('Length');
  public activeType$ = this.activeTypeSubject.asObservable();

  setActiveType(type: string) {
    this.activeTypeSubject.next(type);
  }

  getActiveType(): string {
    return this.activeTypeSubject.value;
  }
}
