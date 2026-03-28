import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { MemoryCardComponent, MemoryCard } from './components/memory-card/memory-card.component';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, MemoryCardComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('memorina');

  cards = signal<MemoryCard[]>(this.buildDeck());
  score = signal(0);

  private flipped = signal<MemoryCard[]>([]);
  private checking = false;          // trava durante a comparação

  /* ── helpers ────────────────────────────────────── */
  isDisabled(card: MemoryCard): boolean {
    // bloqueia novos cliques enquanto dois já estão virados
    return this.checking || this.flipped().length === 2;
  }

  /* ── lógica principal ───────────────────────────── */
  onCardClick(card: MemoryCard): void {
    // vira a carta
    this.updateCard(card.id, { isFlipped: true });
    this.flipped.update(f => [...f, { ...card, isFlipped: true }]);

    if (this.flipped().length < 2) return;

    // dois cartões virados: verifica o par
    this.checking = true;
    const [a, b] = this.flipped();

    setTimeout(() => {
      if (a.pairId === b.pairId) {
        // ✅ match
        this.updateCard(a.id, { isMatched: true });
        this.updateCard(b.id, { isMatched: true });
        this.score.update(s => s + 1);
      } else {
        // ❌ não combina — vira de volta
        this.updateCard(a.id, { isFlipped: false });
        this.updateCard(b.id, { isFlipped: false });
      }
      this.flipped.set([]);
      this.checking = false;
    }, 900);
  }

  /* ── utilitários ────────────────────────────────── */
  private updateCard(id: number, patch: Partial<MemoryCard>): void {
    this.cards.update(cards =>
      cards.map(c => (c.id === id ? { ...c, ...patch } : c))
    );
  }

  private buildDeck(): MemoryCard[] {
    const emojis = ['🐉', '🦋', '🌙', '🍄', '🔮', '🌸', '⚡', '🎯'];
    const pairs: MemoryCard[] = emojis.flatMap((content, pairId) => [
      { id: pairId * 2,     pairId, content, isFlipped: false, isMatched: false },
      { id: pairId * 2 + 1, pairId, content, isFlipped: false, isMatched: false },
    ]);
    // embaralha
    return pairs.sort(() => Math.random() - 0.5);
  }
}
