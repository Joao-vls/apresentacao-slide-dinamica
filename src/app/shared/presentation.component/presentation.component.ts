import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NetworkSimulatorComponent } from '../network-simulator.component/network-simulator.component';
// IMPORTANTE: Importe o componente do simulador que acabamos de criar!


@Component({
  selector: 'app-presentation',
  standalone: true,
  imports: [CommonModule, NetworkSimulatorComponent],
  templateUrl: './presentation.component.html',
  styleUrls: ['./presentation.component.css']
})
export class PresentationComponent {
  currentSlide = signal<number>(0);

  // Lista de slides misturando imagens e o componente interativo
  slides = [
    { type: 'image', src: 'assets/1.png', alt: 'Capa da Apresentação' }, 
    { type: 'image', src: 'assets/2.png', alt: 'Contra' }, 
     { type: 'image', src: 'assets/3.png', alt: 'lan' }, 
    { type: 'simulator' }, 
    { type: 'image', src: 'assets/4.png', alt: 'vantagens e desvantagens' }, 
    { type: 'image', src: 'assets/5.png', alt: 'conclusão' },
    { type: 'image', src: 'assets/6.png', alt: 'referências' }
  ];

  // Escuta os eventos globais do teclado
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' || event.key === ' ') {
      this.nextSlide();
    } else if (event.key === 'ArrowLeft') {
      this.prevSlide();
    }
  }

  nextSlide() {
    if (this.currentSlide() < this.slides.length - 1) {
      this.currentSlide.update(s => s + 1);
    }
  }

  prevSlide() {
    if (this.currentSlide() > 0) {
      this.currentSlide.update(s => s - 1);
    }
  }
}