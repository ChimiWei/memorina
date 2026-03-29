import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { MemoryCardComponent, MemoryCard } from './components/memory-card/memory-card.component';
import { ScoreDisplayComponent } from './components/score-display/score-display.component';
import { MainMenuComponent } from './components/main-menu/main-menu.component';
import { GameConfig } from './components/config-modal/config-modal.component';

type GameScreen = 'menu' | 'playing';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent,
    MemoryCardComponent,
    ScoreDisplayComponent,
    MainMenuComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title = signal('memorina');

  screen = signal<GameScreen>('menu');
  cards = signal<MemoryCard[]>([]);
  score = signal(0);
  config = signal<GameConfig>({ cardsPerRow: 4, totalPairs: 8 });

  private flipped = signal<MemoryCard[]>([]);
  private checking = signal(false);

  /* ── Menu → Game ─────────────────────────────── */
  onStartGame(cfg: GameConfig): void {
    this.config.set(cfg);
    this.cards.set(this.buildDeck(cfg.totalPairs));
    this.score.set(0);
    this.flipped.set([]);
    this.checking.set(false);
    this.screen.set('playing');
  }

  onBackToMenu(): void {
    this.screen.set('menu');
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
        this.updateCard(a.id, { isMatched: true });
        this.updateCard(b.id, { isMatched: true });
        this.score.update(s => s + 1);
      } else {
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

  private buildDeck(totalPairs: number): MemoryCard[] {
    const allEmojis = ['🐉', '🦋', '🌙', '🍄', '🔮', '🌸', '⚡', '🎯'];
    const emojis = allEmojis.slice(0, totalPairs);
    const pairs: MemoryCard[] = emojis.flatMap((content, pairId) => [
      { id: pairId * 2,     pairId, content, isFlipped: false, isMatched: false },
      { id: pairId * 2 + 1, pairId, content, isFlipped: false, isMatched: false },
    ]);

    // embaralha
    return pairs.sort(() => Math.random() - 0.5);
  }
}
