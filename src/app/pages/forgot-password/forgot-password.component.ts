import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1 class="auth-title">Esqueceu sua senha?</h1>
        <p class="auth-subtitle">Informe seu e-mail para receber um link de recuperação.</p>

        @if (successMessage()) {
          <div class="success-banner">
            {{ successMessage() }}
          </div>
          <div class="auth-footer-back">
            <a routerLink="/login">← Voltar ao login</a>
          </div>
        } @else {
          <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="auth-form">
            <div class="form-group">
              <label for="email">E-mail</label>
              <input
                type="email"
                id="email"
                formControlName="email"
                placeholder="seu@email.com"
                autocomplete="email"
                [class.invalid]="forgotForm.get('email')?.invalid && forgotForm.get('email')?.touched"
              />
              @if (forgotForm.get('email')?.invalid && forgotForm.get('email')?.touched) {
                <span class="error-msg">Informe um e-mail válido.</span>
              }
            </div>

            @if (errorMessage()) {
              <div class="error-banner">
                {{ errorMessage() }}
              </div>
            }

            <button type="submit" class="btn-primary" [disabled]="isLoading()">
              @if (isLoading()) {
                <span class="loader"></span>
              } @else {
                Enviar link de recuperação
              }
            </button>

            <div class="auth-footer-back">
              <a routerLink="/login">← Voltar ao login</a>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .success-banner {
      background: rgba(34, 197, 94, 0.1);
      color: #4ade80;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid rgba(34, 197, 94, 0.2);
      font-size: 14px;
      margin-bottom: 24px;
      text-align: center;
    }
  `],
  styleUrl: '../login/login.component.scss', // Reuse auth styles
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  onSubmit() {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email } = this.forgotForm.getRawValue();

    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set('Um link de recuperação foi enviado para o seu e-mail.');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Falha ao enviar o link. Tente novamente.');
      }
    });
  }
}
