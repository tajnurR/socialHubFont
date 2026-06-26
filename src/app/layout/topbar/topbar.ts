import { Component, computed, inject, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

/** Top application bar: title on the left, authenticated user + logout on the right. */
@Component({
  selector: 'app-topbar',
  template: `
    <header class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 class="text-lg font-semibold text-slate-800">Social Media Management</h1>
      <div class="flex items-center gap-3">
        <span class="hidden text-sm text-slate-600 sm:inline">{{ name() }}</span>
        <div class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
          {{ initial() }}
        </div>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          (click)="logout()"
        >
          Logout
        </button>
      </div>
    </header>
  `,
})
export class Topbar implements OnInit {
  private readonly auth = inject(AuthService);

  protected readonly name = computed(() => {
    const user = this.auth.user();
    return user?.displayName || user?.email || 'Account';
  });

  protected readonly initial = computed(() =>
    (this.auth.user()?.displayName || this.auth.user()?.email || '?').charAt(0).toUpperCase(),
  );

  ngOnInit(): void {
    // Populate the profile after a page refresh (token present, user not loaded yet).
    this.auth.loadProfile();
  }

  protected logout(): void {
    this.auth.logout();
  }
}
