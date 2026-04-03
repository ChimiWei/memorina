import {
  Component,
  ChangeDetectionStrategy,
  output,
  signal,
} from '@angular/core';
import { ConfigModalComponent, GameConfig } from '../config-modal/config-modal.component';

@Component({
  selector: 'app-main-menu',
  imports: [ConfigModalComponent],
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainMenuComponent {
  readonly startGame = output<GameConfig>();

  protected readonly showConfig = signal(false);
  protected readonly config = signal<GameConfig>({ cardsPerRow: 2, totalPairs: 4 });

  openConfig(): void {
    this.showConfig.set(true);
  }

  closeConfig(): void {
    this.showConfig.set(false);
  }

  onConfigSave(newConfig: GameConfig): void {
    this.config.set(newConfig);
    this.showConfig.set(false);
  }

  onStart(): void {
    this.startGame.emit(this.config());
  }
}
