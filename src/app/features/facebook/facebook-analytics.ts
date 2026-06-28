import { DatePipe, DecimalPipe, SlicePipe } from '@angular/common';
import { Component, computed, inject, input, numberAttribute, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApexOptions } from 'apexcharts';
import { Chart } from '../../shared/components/chart/chart';
import {
  AnalyticsDashboard,
  AnalyticsFilter,
  AnalyticsGranularity,
  AnalyticsSortBy,
  AnalyticsSortOrder,
  PostRow,
} from '../../shared/models/facebook-analytics.model';
import { FacebookService } from './facebook.service';

type Preset = 'all' | '7' | '30' | '90' | 'custom';

@Component({
  selector: 'app-facebook-analytics',
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe, SlicePipe, Chart],
  templateUrl: './facebook-analytics.html',
})
export class FacebookAnalytics implements OnInit {
  readonly integrationId = input.required({ transform: numberAttribute });

  private readonly facebook = inject(FacebookService);

  protected readonly data = signal<AnalyticsDashboard | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly pageIndex = signal(0);
  protected readonly pageSize = 10;
  protected readonly selectedPost = signal<PostRow | null>(null);

  protected readonly presets: { value: Preset; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: '7', label: '7d' },
    { value: '30', label: '30d' },
    { value: '90', label: '90d' },
    { value: 'custom', label: 'Custom' },
  ];

  protected filterModel: {
    preset: Preset;
    from: string;
    to: string;
    minLikes: number | null;
    minComments: number | null;
    sortBy: AnalyticsSortBy;
    order: AnalyticsSortOrder;
    granularity: AnalyticsGranularity;
  } = {
    preset: 'all',
    from: '',
    to: '',
    minLikes: null,
    minComments: null,
    sortBy: 'DATE',
    order: 'DESC',
    granularity: 'DAY',
  };

  // --- derived view state ---------------------------------------------------

  protected readonly pagedPosts = computed<PostRow[]>(() => {
    const posts = this.data()?.posts ?? [];
    const start = this.pageIndex() * this.pageSize;
    return posts.slice(start, start + this.pageSize);
  });

  protected readonly totalPages = computed(() => {
    const total = this.data()?.posts.length ?? 0;
    return Math.max(1, Math.ceil(total / this.pageSize));
  });

  // --- charts (ApexCharts options) -----------------------------------------

  protected readonly engagementChart = computed<ApexOptions>(() => {
    const s = this.data()?.series ?? [];
    return {
      chart: { type: 'area', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      stroke: { curve: 'smooth', width: 2 },
      dataLabels: { enabled: false },
      colors: ['#6366f1', '#10b981', '#f59e0b'],
      fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
      series: [
        { name: 'Reactions', data: s.map((p) => p.reactions) },
        { name: 'Comments', data: s.map((p) => p.comments) },
        { name: 'Shares', data: s.map((p) => p.shares) },
      ],
      xaxis: {
        categories: s.map((p) => p.date),
        labels: { rotate: -45, style: { fontSize: '10px' } },
      },
      legend: { position: 'top' },
      tooltip: { shared: true },
      noData: { text: 'No data for this period' },
    };
  });

  protected readonly postsChart = computed<ApexOptions>(() => {
    const s = this.data()?.series ?? [];
    return {
      chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      colors: ['#6366f1'],
      series: [{ name: 'Posts', data: s.map((p) => p.posts) }],
      xaxis: {
        categories: s.map((p) => p.date),
        labels: { rotate: -45, style: { fontSize: '10px' } },
      },
      noData: { text: 'No data for this period' },
    };
  });

  protected readonly breakdownChart = computed<ApexOptions>(() => {
    const summary = this.data()?.summary;
    return {
      chart: { type: 'donut', height: 300, fontFamily: 'inherit' },
      labels: ['Reactions', 'Comments', 'Shares'],
      colors: ['#6366f1', '#10b981', '#f59e0b'],
      series: [
        summary?.totalReactions ?? 0,
        summary?.totalComments ?? 0,
        summary?.totalShares ?? 0,
      ],
      legend: { position: 'bottom' },
      dataLabels: { enabled: true },
      noData: { text: 'No data for this period' },
    };
  });

  protected readonly topPostsChart = computed<ApexOptions>(() => {
    const top = [...(this.data()?.posts ?? [])]
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5);
    return {
      chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      dataLabels: { enabled: false },
      colors: ['#8b5cf6'],
      series: [{ name: 'Engagement', data: top.map((p) => p.engagement) }],
      xaxis: { categories: top.map((p) => this.excerpt(p.message, 36)) },
      noData: { text: 'No posts for this period' },
    };
  });

  ngOnInit(): void {
    this.load();
  }

  // --- actions --------------------------------------------------------------

  protected setPreset(preset: Preset): void {
    this.filterModel.preset = preset;
    if (preset === 'all') {
      this.filterModel.from = '';
      this.filterModel.to = '';
      this.load();
    } else if (preset !== 'custom') {
      const days = Number(preset);
      this.filterModel.from = this.daysAgo(days);
      this.filterModel.to = this.today();
      this.load();
    }
  }

  protected apply(): void {
    this.load();
  }

  protected reset(): void {
    this.filterModel = {
      preset: 'all',
      from: '',
      to: '',
      minLikes: null,
      minComments: null,
      sortBy: 'DATE',
      order: 'DESC',
      granularity: 'DAY',
    };
    this.load();
  }

  protected onSort(column: AnalyticsSortBy): void {
    if (this.filterModel.sortBy === column) {
      this.filterModel.order = this.filterModel.order === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.filterModel.sortBy = column;
      this.filterModel.order = 'DESC';
    }
    this.load();
  }

  protected sortIndicator(column: AnalyticsSortBy): string {
    if (this.filterModel.sortBy !== column) {
      return '';
    }
    return this.filterModel.order === 'ASC' ? '▲' : '▼';
  }

  protected prevPage(): void {
    this.pageIndex.update((i) => Math.max(0, i - 1));
  }

  protected nextPage(): void {
    this.pageIndex.update((i) => Math.min(this.totalPages() - 1, i + 1));
  }

  protected openPost(post: PostRow): void {
    this.selectedPost.set(post);
  }

  protected closePost(): void {
    this.selectedPost.set(null);
  }

  // --- comparison / trend helpers ------------------------------------------

  protected trendClass(value: number | null | undefined): string {
    if (value == null) {
      return 'text-slate-400';
    }
    return value >= 0 ? 'text-emerald-600' : 'text-red-600';
  }

  protected trendArrow(value: number | null | undefined): string {
    if (value == null) {
      return '';
    }
    return value >= 0 ? '▲' : '▼';
  }

  protected excerpt(message: string | null | undefined, max = 60): string {
    const text = message?.trim() || '(no message)';
    return text.length > max ? text.slice(0, max) + '…' : text;
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.pageIndex.set(0);
    const filter: AnalyticsFilter = {
      from: this.filterModel.from || undefined,
      to: this.filterModel.to || undefined,
      minLikes: this.filterModel.minLikes ?? undefined,
      minComments: this.filterModel.minComments ?? undefined,
      sortBy: this.filterModel.sortBy,
      order: this.filterModel.order,
      granularity: this.filterModel.granularity,
    };
    this.facebook.analytics(this.integrationId(), filter).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Could not load analytics');
        this.loading.set(false);
      },
    });
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private daysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }
}
