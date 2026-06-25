import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  viewChild,
} from '@angular/core';
import ApexCharts, { ApexOptions } from 'apexcharts';

/**
 * Thin reusable wrapper over the ApexCharts core library (framework-agnostic, so
 * no Angular-version peer-dependency constraints). Pass an ApexCharts options
 * object via `options`; the chart re-renders when it changes.
 */
@Component({
  selector: 'app-chart',
  template: `<div #host class="w-full"></div>`,
})
export class Chart implements OnDestroy {
  /** ApexCharts options object (series, chart type, xaxis, etc.). */
  readonly options = input.required<ApexOptions>();

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private chart: ApexCharts | null = null;

  constructor() {
    afterNextRender(() => {
      this.chart = new ApexCharts(this.host().nativeElement, this.options());
      this.chart.render();
    });
    // Re-apply options whenever they change (after the chart exists).
    effect(() => {
      const opts = this.options();
      if (this.chart) {
        this.chart.updateOptions(opts, false, true);
      }
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
