import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Root component: hosts the routed shell. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}
