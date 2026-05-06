import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface RegisterRequest {
  email: string;
  password?: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
}

export interface PublicConfig {
  googleClientId: string;
}

export interface ProviderLoginRequest {
  provider: string;
  provider_id?: string;
  email?: string;
  name?: string;
  token: string;
}

export interface GameConfig {
  cardsPerRow: number;
  totalPairs: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  // Replace with environment based config where needed
  private apiUrl = '/api';

  public readonly currentUser = signal<User | null>(null);
  public readonly userConfig = signal<GameConfig | null>(null);

  constructor() {
    this.checkLocalToken();
  }

  private checkLocalToken() {
    const user = localStorage.getItem('memorina_user');
    if (user) {
      try {
        this.currentUser.set(JSON.parse(user));
        this.loadConfig();
      } catch {
        this.logout();
      }
    } else {
      this.loadLocalConfig();
    }
  }

  private loadLocalConfig() {
    const localCfg = localStorage.getItem('memorina_config');
    if (localCfg) {
      try {
        this.userConfig.set(JSON.parse(localCfg));
      } catch (e) {
        console.error('Invalid local config');
      }
    }
  }

  loadConfig() {
    if (!this.currentUser()) {
      this.loadLocalConfig();
      return;
    }
    this.http.get<GameConfig>(`${this.apiUrl}/user/config`).subscribe({
      next: (cfg) => {
        this.userConfig.set(cfg);
        // Sync to localstorage just in case
        localStorage.setItem('memorina_config', JSON.stringify(cfg));
      },
      error: (err) => {
        console.warn('Could not load user config, falling back to local/default.', err);
        this.loadLocalConfig();
      }
    });
  }

  saveConfig(config: GameConfig) {
    this.userConfig.set(config);
    localStorage.setItem('memorina_config', JSON.stringify(config));

    if (this.currentUser()) {
      this.http.post(`${this.apiUrl}/user/config`, config).subscribe({
        next: () => {},
        error: (err) => console.error('Failed to save user config remotely', err)
      });
    }
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  getPublicConfig(): Observable<PublicConfig> {
    return this.http.get<PublicConfig>(`${this.apiUrl}/config/public`);
  }

  loginWithProvider(data: ProviderLoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login/provider`, data).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  logout() {
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      next: () => {},
      error: (err) => console.error('Logout error', err)
    });
    localStorage.removeItem('memorina_user');
    localStorage.removeItem('memorina_token');
    this.currentUser.set(null);
    this.loadLocalConfig(); // reverts back to whatever is saved locally for anonymous
    this.router.navigate(['/']);
  }

  private handleAuthSuccess(res: AuthResponse) {
    if (res.user) {
      this.currentUser.set(res.user);
      localStorage.setItem('memorina_user', JSON.stringify(res.user));
    }
    if (res.token) {
      localStorage.setItem('memorina_token', res.token);
    }
    this.loadConfig();
  }
}
