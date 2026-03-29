import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  effect,
  computed,
  OnDestroy,
} from '@angular/core';

export interface MultiplierTier {
  value: number;
  label: string;
  cssClass: string;
  maxSeconds: number;
}

const TIERS: MultiplierTier[] = [
  { value: 3,   label: '3×', cssClass: 'tier-gold',   maxSeconds: 6 },
  { value: 2,   label: '2×', cssClass: 'tier-blue',   maxSeconds: 12 },
  { value: 1.5, label: '1.5×', cssClass: 'tier-green', maxSeconds: 16 },
  { value: 1,   label: '1×', cssClass: 'tier-dim',    maxSeconds: Infinity },
];

@Component({
  selector: 'app-multiplier-display',
  templateUrl: './multiplier-display.component.html',
  styleUrls: ['./multiplier-display.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiplierDisplayComponent implements OnDestroy {
  /** Current game elapsed seconds */
  readonly elapsedSeconds = input(0);

  /** Elapsed seconds at which the last match happened */
  readonly lastMatchAt = input(0);

  protected readonly timeSinceMatch = signal(0);
  protected readonly currentTier = signal<MultiplierTier>(TIERS[0]);

  /** Progress bar percentage (depletes from 100 → 0 as multiplier drops) */
  protected readonly progressPct = computed(() => {
    const t = this.timeSinceMatch();
    // Map 0s → 100%, 16s+ → 0%
    const maxTime = 16;
    return Math.max(0, Math.round(((maxTime - t) / maxTime) * 100));
  });

  private animFrameId: ReturnType<typeof requestAnimationFrame> | null = null;
  private lastUpdateAt = 0;

  constructor() {
    effect(() => {
      const elapsed = this.elapsedSeconds();
      const matchAt = this.lastMatchAt();
      const diff = Math.max(0, elapsed - matchAt);
      this.timeSinceMatch.set(diff);

      // Determine the tier
      const tier = TIERS.find(t => diff < t.maxSeconds) ?? TIERS[TIERS.length - 1];
      this.currentTier.set(tier);
    });
  }

  ngOnDestroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
  }
}

export { TIERS as MULTIPLIER_TIERS };

/** Utility: get multiplier value for a given time delta */
export function getMultiplierForDelta(secondsSinceLastMatch: number): number {
  const tier = TIERS.find(t => secondsSinceLastMatch < t.maxSeconds);
  return tier ? tier.value : 1;
}
