import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, numberAttribute, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SocialIntegrationsService } from './social-integrations.service';

/**
 * New Post form. Message now; the form is structured so media/link/scheduling
 * fields can be added later (the optional `link` field is already wired).
 */
@Component({
  selector: 'app-new-post',
  imports: [ReactiveFormsModule, RouterLink, PageHeader],
  template: `
    <app-page-header title="New Post" subtitle="Publish a post to this account" />

    <form
      [formGroup]="form"
      (ngSubmit)="submit()"
      class="max-w-lg rounded-xl border border-slate-200 bg-white p-6"
    >
      <div class="mb-4">
        <label class="mb-1 block text-sm font-medium text-slate-700">Message</label>
        <textarea
          formControlName="message"
          rows="5"
          placeholder="What do you want to share?"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        ></textarea>
        @if (form.controls.message.invalid && form.controls.message.touched) {
          <p class="mt-1 text-xs text-red-600">A message is required.</p>
        }
      </div>

      <div class="mb-4">
        <label class="mb-1 block text-sm font-medium text-slate-700"
          >Link <span class="text-slate-400">(optional)</span></label
        >
        <input
          type="url"
          formControlName="link"
          placeholder="https://…"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div class="mt-6 flex gap-2">
        <button
          type="submit"
          [disabled]="submitting()"
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {{ submitting() ? 'Publishing…' : 'Publish' }}
        </button>
        <a
          routerLink="/facebook"
          class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </a>
      </div>
    </form>
  `,
})
export class NewPost {
  /** Bound from the route param via withComponentInputBinding. */
  readonly id = input.required({ transform: numberAttribute });

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SocialIntegrationsService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    message: ['', Validators.required],
    link: [''],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const { message, link } = this.form.getRawValue();
    this.service.createPost(this.id(), { message, link: link || undefined }).subscribe({
      next: () => {
        this.notifications.success('Post published');
        this.router.navigate(['/facebook', this.id(), 'analytics']);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.notifications.error(err.error?.message ?? 'Failed to publish post');
      },
    });
  }
}
