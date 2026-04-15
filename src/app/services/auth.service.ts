import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap, map, catchError } from 'rxjs';

export interface User {
  username: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'https://quantitymeasurementapp-ock1.onrender.com/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();
  public isLoggedIn$ = this.currentUser$.pipe(map(user => !!user));

  constructor(private http: HttpClient) {}

  private getUserFromStorage(): User | null {
    const user = localStorage.getItem('qm_user');
    const token = localStorage.getItem('qm_token');
    if (user && token) {
      try {
        return { username: JSON.parse(user).username, token };
      } catch {
        return null;
      }
    }
    return null;
  }

  public get token(): string | null {
    return this.currentUserSubject.value?.token || null;
  }

  login(credentials: any) {
    return this.http.post<any>(`${this.API_URL}/login`, credentials).pipe(
      tap(res => {
        if (res.token && res.username) {
          this.setSession(res);
        }
      })
    );
  }

  register(credentials: any) {
    return this.http.post<any>(`${this.API_URL}/register`, credentials).pipe(
      tap(res => {
        if (res.token && res.username) {
          this.setSession(res);
        }
      })
    );
  }

  googleLogin(idToken: string) {
    return this.http.post<any>(`${this.API_URL}/google-login`, { IdToken: idToken }).pipe(
      tap(res => {
        if (res.token && res.username) {
          this.setSession(res);
        }
      })
    );
  }

  private setSession(authResult: any) {
    localStorage.setItem('qm_token', authResult.token);
    localStorage.setItem('qm_user', JSON.stringify({ username: authResult.username }));
    this.currentUserSubject.next({ username: authResult.username, token: authResult.token });
  }

  logout() {
    localStorage.removeItem('qm_token');
    localStorage.removeItem('qm_user');
    this.currentUserSubject.next(null);
  }
}
