import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';

export interface MemoryCard {
  id: number;
  pairId: number;
  content: string;
  imageUrl?: string;
  isFlipped: boolean;
  isMatched: boolean;
}

@Component({
  selector: 'app-memory-card',
  templateUrl: './memory-card.component.html',
  styleUrls: ['./memory-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.flipped]': 'card().isFlipped',
    '[class.matched]': 'card().isMatched',
    '[class.disabled]': 'disabled() || card().isMatched',
  },
})
export class MemoryCardComponent {
  readonly card = input.required<MemoryCard>();

  /** Impede cliques quando outra animação está rolando ou o par já foi encontrado */
  readonly disabled = input(false);

  readonly cardClick = output<MemoryCard>();

  handleClick(): void {
    const c = this.card();
    if (this.disabled() || c.isFlipped || c.isMatched) return;
    this.cardClick.emit(c);
  }
}
