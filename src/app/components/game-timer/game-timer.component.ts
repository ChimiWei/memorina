import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  effect,
  OnDestroy,
} from '@angular/core';

@Component({
  selector: 'app-game-timer',
  templateUrl: './game-timer.component.html',
  styleUrls: ['./game-timer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameTimerComponent implements OnDestroy {
  /** Whether the timer is running */
  readonly running = input(false);

  /** Emits the elapsed seconds every tick */
  readonly tick = output<number>();

  protected readonly elapsed = signal(0);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const isRunning = this.running();

      // Clear any existing interval first
      this.clearInterval();

      if (isRunning) {
        this.intervalId = setInterval(() => {
          this.elapsed.update(s => s + 1);
          this.tick.emit(this.elapsed());
        }, 1000);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearInterval();
  }

  protected formatTime(): string {
    const s = this.elapsed();
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  private clearInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
