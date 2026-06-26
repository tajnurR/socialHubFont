import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/** Email/password login page. */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div class="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-6 text-center">
          <span class="text-2xl font-bold text-indigo-600">Social</span><span class="text-2xl font-bold text-slate-800">Hub</span>
          <p class="mt-1 text-sm text-slate-500">Sign in to your account</p>
        </div>

        @if (error()) {
          <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="mb-4">
            <label class="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input type="email" formControlName="email" autocomplete="email"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
            @if (invalid('email')) { <p class="mt-1 text-xs text-red-600">A valid email is required.</p> }
          </div>
          <div class="mb-6">
            <label class="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input type="password" formControlName="password" autocomplete="current-password"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
            @if (invalid('password')) { <p class="mt-1 text-xs text-red-600">Password is required.</p> }
          </div>
          <button type="submit" [disabled]="busy()"
            class="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {{ busy() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="mt-4 text-center text-sm text-slate-500">
          No account? <a routerLink="/register" class="font-medium text-indigo-600 hover:underline">Create one</a>
        </p>
      </div>
    </div>
  `,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected invalid(key: string): boolean {
    const control = this.form.get(key);
    return !!control && control.invalid && control.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(err.error?.message ?? 'Login failed');
      },
    });
  }
}
