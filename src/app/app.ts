import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OfflineBannerComponent } from './core/offline/components/offline-banner/offline-banner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, OfflineBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('front-huellas');
}
