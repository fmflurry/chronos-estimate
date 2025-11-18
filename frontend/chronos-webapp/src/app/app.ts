import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<h1>Hello, {{ title() }}</h1><router-outlet />`,
  styles: [`h1 { color: blue; }`]
})
export class App {
  protected readonly title = signal('chronos-webapp');
}
