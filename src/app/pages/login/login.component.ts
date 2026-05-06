import { Component, inject, signal, ChangeDetectionStrategy, AfterViewInit, NgZone, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private zone = inject(NgZone);

  @ViewChild('googleBtn') googleBtn!: ElementRef;

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  ngAfterViewInit() {
    this.initGoogleLogin();
  }

  private initGoogleLogin() {
    this.authService.getPublicConfig().subscribe({
      next: (config) => {
        if (config.googleClientId) {
          google.accounts.id.initialize({
            client_id: config.googleClientId,
            callback: (response: any) => this.handleGoogleLogin(response)
          });
          google.accounts.id.renderButton(
            this.googleBtn.nativeElement,
            { theme: 'outline', size: 'large', width: '100%', text: 'signin_with', locale: 'pt_BR' }
          );
        }
      },
      error: (err) => console.error('Failed to load public config for Google login', err)
    });
  }

  private handleGoogleLogin(response: any) {
    this.zone.run(() => {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      this.authService.loginWithProvider({
        provider: 'google',
        token: response.credential
      }).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err?.error?.message || 'Falha ao fazer login com Google.');
        }
      });
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.getRawValue();

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/']); // redirect to game
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Falha ao fazer login. Verifique suas credenciais.');
      }
    });
  }
}
