import {
  Component,
  ChangeDetectionStrategy,
  output,
  signal,
  computed,
  inject,
} from '@angular/core';
import { ConfigModalComponent, GameConfig } from '../config-modal/config-modal.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-main-menu',
  imports: [ConfigModalComponent],
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainMenuComponent {
  readonly startGame = output<GameConfig>();

  private authService = inject(AuthService);

  protected readonly showConfig = signal(false);
  protected readonly config = computed<GameConfig>(() => {
    return this.authService.userConfig() ?? { cardsPerRow: 2, totalPairs: 4 };
  });

  openConfig(): void {
    this.showConfig.set(true);
  }

  closeConfig(): void {
    this.showConfig.set(false);
  }

  onConfigSave(newConfig: GameConfig): void {
    this.authService.saveConfig(newConfig);
    this.showConfig.set(false);
  }

  onStart(): void {
    this.startGame.emit(this.config());
  }
}
