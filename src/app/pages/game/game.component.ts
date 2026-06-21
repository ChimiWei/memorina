import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';
import { MemoryCardComponent, MemoryCard } from '../../components/memory-card/memory-card.component';
import { ScoreDisplayComponent } from '../../components/score-display/score-display.component';
import { MainMenuComponent } from '../../components/main-menu/main-menu.component';
import { GameConfig } from '../../components/config-modal/config-modal.component';
import { CardSetupComponent } from '../../components/card-setup/card-setup.component';
import { GameTimerComponent } from '../../components/game-timer/game-timer.component';
import { MultiplierDisplayComponent, getMultiplierForDelta } from '../../components/multiplier-display/multiplier-display.component';

type GameScreen = 'menu' | 'setup' | 'playing';

@Component({
  selector: 'app-game',
  imports: [
    HeaderComponent,
    MemoryCardComponent,
    ScoreDisplayComponent,
    MainMenuComponent,
    CardSetupComponent,
    GameTimerComponent,
    MultiplierDisplayComponent,
  ],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent {
  screen = signal<GameScreen>('menu');
  cards = signal<MemoryCard[]>([]);
  score = signal(0);
  config = signal<GameConfig>({ cardsPerRow: 2, totalPairs: 4 });

  elapsedSeconds = signal(0);
  lastMatchAt = signal(0);
  isPlaying = signal(false);
  isGameOver = signal(false);
  currentImages = signal<string[]>([]);

  private flipped = signal<MemoryCard[]>([]);
  private checking = signal(false);

  /* ── Menu → Setup/Game ────────────────────────── */
  onMenuStart(cfg: GameConfig): void {
    this.config.set(cfg);
    this.screen.set('setup');
  }

  onDirectStart(data: { config: GameConfig; images: string[] }): void {
    this.config.set(data.config);
    this.currentImages.set(data.images);
    this.startNewGame(data.images);
    this.screen.set('playing');
  }

  /* ── Setup → Game ────────────────────────────── */
  onSetupStart(images: string[]): void {
    this.currentImages.set(images);
    this.startNewGame(images);
    this.screen.set('playing');
  }

  onRestart(): void {
    this.startNewGame(this.currentImages());
  }

  private startNewGame(images: string[]): void {
    this.cards.set(this.buildDeck(images));
    this.score.set(0);
    this.flipped.set([]);
    this.checking.set(false);
    
    this.elapsedSeconds.set(0);
    this.lastMatchAt.set(0);
    this.isPlaying.set(true);
    this.isGameOver.set(false);
  }

  onBackToMenu(): void {
    this.isPlaying.set(false);
    this.screen.set('menu');
  }

  onTimerTick(seconds: number): void {
    this.elapsedSeconds.set(seconds);
  }

  /* ── helpers ────────────────────────────────────── */
  isDisabled(card: MemoryCard): boolean {
    return this.checking() || this.flipped().length === 2;
  }

  /* ── lógica principal ───────────────────────────── */
  onCardClick(card: MemoryCard): void {
    this.updateCard(card.id, { isFlipped: true });
    this.flipped.update(f => [...f, { ...card, isFlipped: true }]);

    if (this.flipped().length < 2) return;

    this.checking.set(true);
    const [a, b] = this.flipped();

    setTimeout(() => {
      if (a.pairId === b.pairId) {
        // ✅ match
        this.updateCard(a.id, { isMatched: true });
        this.updateCard(b.id, { isMatched: true });
        
        // Compute points based on multiplier
        const diff = Math.max(0, this.elapsedSeconds() - this.lastMatchAt());
        const multiplier = getMultiplierForDelta(diff);
        const points = Math.floor(10 * multiplier);
        
        this.score.update(s => s + points);
        this.lastMatchAt.set(this.elapsedSeconds());

        // Check win condition
        if (this.cards().every(c => c.isMatched)) {
          this.isPlaying.set(false);
          this.isGameOver.set(true);
        }

      } else {
        // ❌ não combina — vira de volta
        this.updateCard(a.id, { isFlipped: false });
        this.updateCard(b.id, { isFlipped: false });
      }
      this.flipped.set([]);
      this.checking.set(false);
    }, 900);
  }

  /* ── utilitários ────────────────────────────────── */
  private updateCard(id: number, patch: Partial<MemoryCard>): void {
    this.cards.update(cards =>
      cards.map(c => (c.id === id ? { ...c, ...patch } : c))
    );
  }

  private buildDeck(images: string[]): MemoryCard[] {
    const pairs: MemoryCard[] = images.flatMap((imageUrl, pairId) => [
      // content string no longer central to UI, but good for logs/debugging
      { id: pairId * 2,     pairId, content: `Image ${pairId}`, imageUrl, isFlipped: false, isMatched: false },
      { id: pairId * 2 + 1, pairId, content: `Image ${pairId}`, imageUrl, isFlipped: false, isMatched: false },
    ]);

    // embaralha
    return pairs.sort(() => Math.random() - 0.5);
  }
}
