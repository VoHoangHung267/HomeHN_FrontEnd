import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiResponse, AuthResponse, EmailAvailabilityResponse, User } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/api/auth`;

  private readonly _user = signal<User | null>(this.loadStoredUser());
  private readonly _token = signal<string | null>(localStorage.getItem('accessToken'));

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();

  readonly isLoggedIn = computed(() => !!this._token());
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');
  readonly isLandlord = computed(() => this._user()?.role === 'LANDLORD');
  readonly isSeeker = computed(() => this._user()?.role === 'SEEKER');
  readonly currentRole = computed(() => this._user()?.role ?? null);

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  register(payload: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: string;
    verificationCode: string;
  }): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API}/register`, payload).pipe(
      tap(r => this.persist(r.data))
    );
  }

  checkEmail(email: string): Observable<ApiResponse<EmailAvailabilityResponse>> {
    return this.http.get<ApiResponse<EmailAvailabilityResponse>>(`${this.API}/check-email`, {
      params: { email }
    });
  }

  sendRegistrationVerificationCode(email: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.API}/send-verification-code`, { email });
  }

  login(email: string, password: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API}/login`, { email, password }).pipe(
      tap(r => this.persist(r.data))
    );
  }

  forgotPassword(email: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.API}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.API}/reset-password`, { token, newPassword });
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    const rt = localStorage.getItem('refreshToken');
    return this.http.post<ApiResponse<AuthResponse>>(
      `${this.API}/refresh-token`, { refreshToken: rt }
    ).pipe(tap(r => this.persist(r.data)));
  }

  logout(): void {
    this.http.post(`${this.API}/logout`, {}).subscribe({ error: () => {} });
    this.clear();
    this.router.navigate(['/']);
  }

  updateUser(user: User): void {
    this._user.set(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  private persist(data: AuthResponse): void {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    this._token.set(data.accessToken);
    this._user.set(data.user);
  }

  private clear(): void {
    localStorage.clear();
    this._token.set(null);
    this._user.set(null);
  }

  private loadStoredUser(): User | null {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) as User : null;
    } catch {
      return null;
    }
  }
}
