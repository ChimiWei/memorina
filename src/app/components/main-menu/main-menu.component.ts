import {
  Component,
  ChangeDetectionStrategy,
  output,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { ConfigModalComponent, GameConfig } from '../config-modal/config-modal.component';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-main-menu',
  imports: [ConfigModalComponent],
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainMenuComponent implements OnInit {
  readonly startGame = output<GameConfig>();
  readonly directStart = output<{ config: GameConfig; images: string[] }>();

  private authService = inject(AuthService);
  private imageService = inject(ImageService);

  protected readonly showConfig = signal(false);
  protected readonly config = computed<GameConfig>(() => {
    return this.authService.userConfig() ?? { cardsPerRow: 2, totalPairs: 4 };
  });

  protected readonly canDirectStart = computed(() => 
    this.imageService.images().length >= this.config().totalPairs
  );

  ngOnInit(): void {
    this.imageService.loadUserImages();
  }

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

  onSelectPhotos(): void {
    this.startGame.emit(this.config());
  }

  onDirectStart(): void {
    const cfg = this.config();
    const images = this.imageService.images()
      .slice(0, cfg.totalPairs)
      .map(img => img.url);
    
    this.directStart.emit({ config: cfg, images });
  }
}
