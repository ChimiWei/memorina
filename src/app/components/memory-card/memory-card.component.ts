import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostBinding,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MemoryCard {
  id: number;
  pairId: number;
  content: string; // emoji, imagem ou texto
  isFlipped: boolean;
  isMatched: boolean;
}

@Component({
  selector: 'app-memory-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memory-card.component.html',
  styleUrls: ['./memory-card.component.scss'],
})
export class MemoryCardComponent {
  @Input({ required: true }) card!: MemoryCard;

  /** Impede cliques quando outra animação está rolando ou o par já foi encontrado */
  @Input() disabled = false;

  @Output() cardClick = new EventEmitter<MemoryCard>();

  @HostBinding('class.flipped') get flipped() {
    return this.card?.isFlipped;
  }

  @HostBinding('class.matched') get matched() {
    return this.card?.isMatched;
  }

  @HostBinding('class.disabled') get isDisabled() {
    return this.disabled || this.card?.isMatched;
  }

  handleClick(): void {
    if (this.disabled || this.card.isFlipped || this.card.isMatched) return;
    this.cardClick.emit(this.card);
  }
}
