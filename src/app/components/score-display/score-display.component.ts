import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  effect,
  ElementRef,
  inject,
} from '@angular/core';

@Component({
  selector: 'app-score-display',
  templateUrl: './score-display.component.html',
  styleUrls: ['./score-display.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.bumped]': 'bumped()',
  },
})
export class ScoreDisplayComponent {
  readonly score = input.required<number>();

  protected readonly bumped = signal(false);

  private readonly el = inject(ElementRef);
  private isFirstRun = true;

  constructor() {
    effect(() => {
      const _score = this.score(); // subscribe to changes

      // Skip the animation on initial render
      if (this.isFirstRun) {
        this.isFirstRun = false;
        return;
      }

      // Trigger bump animation
      this.bumped.set(true);
      setTimeout(() => this.bumped.set(false), 500);
    });
  }
}
