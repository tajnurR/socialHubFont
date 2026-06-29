import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

/** App navigation sidebar. Add a feature route here to surface it in the nav. */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div class="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <span class="text-xl font-bold text-indigo-600">Social</span>
        <span class="text-xl font-bold text-slate-800">Hub</span>
      </div>
      <nav class="flex-1 space-y-1 px-3 py-4">
        @for (item of navItems; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="bg-indigo-50 text-indigo-700"
            [routerLinkActiveOptions]="{ exact: false }"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <span class="text-base">{{ item.icon }}</span>
            {{ item.label }}
          </a>
        }
      </nav>
      <div class="border-t border-slate-200 px-6 py-4 text-xs text-slate-400">
        v0.0.0 &middot; foundation
      </div>
    </aside>
  `,
})
export class Sidebar {
  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: '▥' },
    { label: 'Accounts', path: '/accounts', icon: '⚇' },
    { label: 'Analytics', path: '/analytics', icon: '▦' },
    { label: 'Facebook', path: '/facebook', icon: 'f' },
    { label: 'Bulk upload', path: '/posts/bulk-upload', icon: '⭱' },
    { label: 'Drafts', path: '/posts/drafts', icon: '✎' },
    { label: 'Scheduled & posted', path: '/posts/monitor', icon: '⏲' },
    { label: 'Schedules', path: '/schedules', icon: '🗓' },
    { label: 'Products', path: '/products', icon: '⬡' },
    { label: 'Instagram', path: '/instagram', icon: '◉' },
    { label: 'WhatsApp', path: '/whatsapp', icon: '✆' },
    { label: 'Social Integrations', path: '/settings/social-integrations', icon: '⚙' },
  ];
}
