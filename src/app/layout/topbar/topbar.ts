import { Component } from '@angular/core';

/** Top application bar: page context on the left, user placeholder on the right. */
@Component({
  selector: 'app-topbar',
  template: `
    <header
      class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6"
    >
      <h1 class="text-lg font-semibold text-slate-800">Social Media Management</h1>
      <div class="flex items-center gap-3">
        <!-- TODO[SSO]: replace with the authenticated user's name/avatar. -->
        <span class="hidden text-sm text-slate-500 sm:inline">Guest</span>
        <div
          class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700"
        >
          G
        </div>
      </div>
    </header>
  `,
})
export class Topbar {}
