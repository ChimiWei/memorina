import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  OnInit,
} from '@angular/core';

export interface GameConfig {
  cardsPerRow: number;
  totalPairs: number;
}

/** Maximum pairs the game supports (8 emojis available) */
const MAX_PAIRS = 8;
const MIN_PAIRS = 2;

@Component({
  selector: 'app-config-modal',
  templateUrl: './config-modal.component.html',
  styleUrls: ['./config-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'role': 'dialog',
    'aria-modal': 'true',
    'aria-label': 'Configurações do jogo',
    '(keydown.escape)': 'onClose()',
  },
})
export class ConfigModalComponent implements OnInit {
  readonly config = input.required<GameConfig>();
  readonly save = output<GameConfig>();
  readonly close = output<void>();

  protected readonly totalPairs = signal(8);
  protected readonly cardsPerRow = signal(4);

  protected readonly maxPairs = MAX_PAIRS;
  protected readonly minPairs = MIN_PAIRS;

  /** Total cards derived from pairs */
  protected readonly totalCards = computed(() => this.totalPairs() * 2);

  /**
   * Valid cards-per-row options: divisors of totalCards that are >= 2,
   * so every row is always complete (no holes).
   */
  protected readonly validPerRowOptions = computed(() => {
    const total = this.totalCards();
    const divisors: number[] = [];
    for (let i = 2; i <= total; i++) {
      if (total % i === 0) {
        divisors.push(i);
      }
    }
    return divisors;
  });

  protected readonly canIncrementPairs = computed(() => this.totalPairs() < MAX_PAIRS);
  protected readonly canDecrementPairs = computed(() => this.totalPairs() > MIN_PAIRS);

  protected readonly canIncrementPerRow = computed(() => {
    const opts = this.validPerRowOptions();
    const idx = opts.indexOf(this.cardsPerRow());
    return idx < opts.length - 1;
  });

  protected readonly canDecrementPerRow = computed(() => {
    const opts = this.validPerRowOptions();
    const idx = opts.indexOf(this.cardsPerRow());
    return idx > 0;
  });

  ngOnInit(): void {
    const cfg = this.config();
    this.totalPairs.set(cfg.totalPairs);
    this.cardsPerRow.set(cfg.cardsPerRow);
    this.clampPerRow();
  }

  incrementPairs(): void {
    if (!this.canIncrementPairs()) return;
    this.totalPairs.update(v => v + 1);
    this.clampPerRow();
  }

  decrementPairs(): void {
    if (!this.canDecrementPairs()) return;
    this.totalPairs.update(v => v - 1);
    this.clampPerRow();
  }

  incrementPerRow(): void {
    const opts = this.validPerRowOptions();
    const idx = opts.indexOf(this.cardsPerRow());
    if (idx < opts.length - 1) {
      this.cardsPerRow.set(opts[idx + 1]);
    }
  }

  decrementPerRow(): void {
    const opts = this.validPerRowOptions();
    const idx = opts.indexOf(this.cardsPerRow());
    if (idx > 0) {
      this.cardsPerRow.set(opts[idx - 1]);
    }
  }

  onSave(): void {
    this.save.emit({
      cardsPerRow: this.cardsPerRow(),
      totalPairs: this.totalPairs(),
    });
  }

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onClose();
    }
  }

  /** Ensure cardsPerRow is always a valid divisor after pairs change */
  private clampPerRow(): void {
    const opts = this.validPerRowOptions();
    const current = this.cardsPerRow();
    if (!opts.includes(current)) {
      // Pick the closest valid option
      const closest = opts.reduce((prev, curr) =>
        Math.abs(curr - current) < Math.abs(prev - current) ? curr : prev
      );
      this.cardsPerRow.set(closest);
    }
  }
}
