import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Product, ProductRequest } from '../../shared/models/publishing.model';
import { PublishingService } from './publishing.service';

/** Demo product catalog CRUD. Posts can reference a product by SKU during import. */
@Component({
  selector: 'app-products',
  imports: [PageHeader, FormsModule],
  template: `
    <app-page-header title="Products" subtitle="Demo catalog you can link posts to" />

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2">
        @if (loading()) {
          <p class="text-sm text-slate-400">Loading products…</p>
        } @else {
          <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th class="px-4 py-3">Name</th>
                  <th class="px-4 py-3">SKU</th>
                  <th class="px-4 py-3">Description</th>
                  <th class="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (p of products(); track p.id) {
                  <tr>
                    <td class="px-4 py-3 font-medium text-slate-800">{{ p.name }}</td>
                    <td class="px-4 py-3 font-mono text-xs text-slate-500">{{ p.sku || '—' }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ p.description || '—' }}</td>
                    <td class="px-4 py-3 text-right">
                      <button (click)="edit(p)" class="text-xs font-medium text-indigo-600 hover:underline">
                        Edit
                      </button>
                      <button (click)="remove(p)" class="ml-3 text-xs font-medium text-red-600 hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="px-4 py-6 text-center text-sm text-slate-400">
                      No products yet.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="font-semibold text-slate-800">{{ editingId() ? 'Edit product' : 'New product' }}</h3>
        <div class="mt-3 space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-500">Name *</label>
            <input
              [(ngModel)]="form.name"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500">SKU</label>
            <input
              [(ngModel)]="form.sku"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500">Description</label>
            <textarea
              [(ngModel)]="form.description"
              rows="3"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            ></textarea>
          </div>
          <div class="flex gap-2">
            <button
              (click)="save()"
              [disabled]="!form.name.trim() || saving()"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {{ saving() ? 'Saving…' : 'Save' }}
            </button>
            @if (editingId()) {
              <button (click)="resetForm()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                Cancel
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class Products implements OnInit {
  private readonly publishing = inject(PublishingService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<number | null>(null);

  protected form: ProductRequest = { name: '', sku: '', description: '' };

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.publishing.listProducts().subscribe({
      next: (list) => {
        this.products.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Could not load products.');
        this.loading.set(false);
      },
    });
  }

  protected edit(p: Product): void {
    this.editingId.set(p.id);
    this.form = { name: p.name, sku: p.sku ?? '', description: p.description ?? '' };
  }

  protected resetForm(): void {
    this.editingId.set(null);
    this.form = { name: '', sku: '', description: '' };
  }

  protected save(): void {
    if (!this.form.name.trim()) {
      return;
    }
    this.saving.set(true);
    const id = this.editingId();
    const req$ = id
      ? this.publishing.updateProduct(id, this.form)
      : this.publishing.createProduct(this.form);
    req$.subscribe({
      next: () => {
        this.notify.success(id ? 'Product updated.' : 'Product created.');
        this.saving.set(false);
        this.resetForm();
        this.load();
      },
      error: (err) => {
        this.notify.error(err?.error?.message ?? 'Could not save product.');
        this.saving.set(false);
      },
    });
  }

  protected async remove(p: Product): Promise<void> {
    const ok = await this.confirm.ask(`Delete "${p.name}"?`, 'Delete product', 'Delete');
    if (!ok) {
      return;
    }
    this.publishing.deleteProduct(p.id).subscribe({
      next: () => {
        this.notify.success('Product deleted.');
        this.load();
      },
      error: (err) => this.notify.error(err?.error?.message ?? 'Could not delete product.'),
    });
  }
}
