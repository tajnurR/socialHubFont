import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { Toast } from '../../shared/components/toast/toast';
import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';

/**
 * Application shell: fixed sidebar + topbar with a routed content area, plus the
 * app-wide toast and confirm-dialog overlays.
 */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, Topbar, Toast, ConfirmDialog],
  template: `
    <div class="flex h-screen overflow-hidden bg-slate-50">
      <!-- Sidebar: hidden on small screens, shown from md up. -->
      <div class="hidden md:block">
        <app-sidebar />
      </div>
      <div class="flex min-w-0 flex-1 flex-col">
        <app-topbar />
        <main class="flex-1 overflow-y-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
    <app-toast />
    <app-confirm-dialog />
  `,
})
export class MainLayout {}
