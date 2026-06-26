import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/** Self-registration page. New users join the default organization. */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div class="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-6 text-center">
          <span class="text-2xl font-bold text-indigo-600">Social</span><span class="text-2xl font-bold text-slate-800">Hub</span>
          <p class="mt-1 text-sm text-slate-500">Create your account</p>
        </div>

        @if (error()) {
          <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="mb-4">
            <label class="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input type="text" formControlName="displayName" autocomplete="name"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
            @if (invalid('displayName')) { <p class="mt-1 text-xs text-red-600">Name is required.</p> }
          </div>
          <div class="mb-4">
            <label class="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input type="email" formControlName="email" autocomplete="email"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
            @if (invalid('email')) { <p class="mt-1 text-xs text-red-600">A valid email is required.</p> }
          </div>
          <div class="mb-6">
            <label class="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input type="password" formControlName="password" autocomplete="new-password"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
            @if (invalid('password')) { <p class="mt-1 text-xs text-red-600">At least 8 characters.</p> }
          </div>
          <button type="submit" [disabled]="busy()"
            class="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {{ busy() ? 'Creating…' : 'Create account' }}
          </button>
        </form>

        <p class="mt-4 text-center text-sm text-slate-500">
          Already have an account? <a routerLink="/login" class="font-medium text-indigo-600 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  `,
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    displayName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
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
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(err.error?.message ?? 'Registration failed');
      },
    });
  }
}
