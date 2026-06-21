import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1 class="auth-title">Nova senha</h1>
        <p class="auth-subtitle">Escolha uma nova senha para sua conta.</p>

        @if (successMessage()) {
          <div class="success-banner">
            {{ successMessage() }}
          </div>
          <div class="auth-footer-back">
            <a routerLink="/login">Ir para o login →</a>
          </div>
        } @else {
          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="auth-form">
            
            <div class="form-group">
              <label for="password">Nova senha</label>
              <input
                type="password"
                id="password"
                formControlName="password"
                placeholder="Mínimo 6 caracteres"
                autocomplete="new-password"
                [class.invalid]="resetForm.get('password')?.invalid && resetForm.get('password')?.touched"
              />
              @if (resetForm.get('password')?.touched) {
                @if (resetForm.get('password')?.hasError('required')) {
                  <span class="error-msg">A senha é obrigatória.</span>
                } @else if (resetForm.get('password')?.hasError('minlength')) {
                  <span class="error-msg">A senha deve ter no mínimo 6 caracteres.</span>
                }
              }
            </div>

            <div class="form-group">
              <label for="confirmPassword">Confirmar nova senha</label>
              <input
                type="password"
                id="confirmPassword"
                formControlName="confirmPassword"
                placeholder="Repita a nova senha"
                autocomplete="new-password"
                [class.invalid]="(resetForm.get('confirmPassword')?.invalid || resetForm.hasError('passwordMismatch')) && resetForm.get('confirmPassword')?.touched"
              />
              @if (resetForm.get('confirmPassword')?.touched) {
                @if (resetForm.get('confirmPassword')?.hasError('required')) {
                  <span class="error-msg">A confirmação é obrigatória.</span>
                } @else if (resetForm.hasError('passwordMismatch')) {
                  <span class="error-msg">As senhas não coincidem.</span>
                }
              }
            </div>

            @if (errorMessage()) {
              <div class="error-banner">
                {{ errorMessage() }}
              </div>
            }

            <button type="submit" class="btn-primary" [disabled]="isLoading() || !token()">
              @if (isLoading()) {
                <span class="loader"></span>
              } @else {
                Alterar senha
              }
            </button>
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
  styleUrl: '../login/login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  private passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    if (!password || !confirmPassword) return null;
    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  };

  token = signal<string | null>(null);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  resetForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: [this.passwordMatchValidator] });

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.errorMessage.set('Token de recuperação inválido ou ausente.');
    } else {
      this.token.set(token);
    }
  }

  onSubmit() {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const token = this.token();
    if (!token) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { password } = this.resetForm.getRawValue();

    this.authService.resetPassword(token, password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Sua senha foi alterada com sucesso!');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Falha ao resetar a senha. O token pode ter expirado.');
      }
    });
  }
}
