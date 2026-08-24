import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PresentationComponent } from './shared/presentation.component/presentation.component';


@Component({
  selector: 'app-root',
  imports: [ PresentationComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('lan');
}
