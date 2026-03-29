import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  ElementRef,
  viewChildren,
} from '@angular/core';

@Component({
  selector: 'app-card-setup',
  templateUrl: './card-setup.component.html',
  styleUrls: ['./card-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardSetupComponent {
  /** How many unique images the user needs to upload */
  readonly totalPairs = input.required<number>();

  /** How many cards per row for the grid preview */
  readonly cardsPerRow = input(4);

  /** Emits the array of data-URL strings when the user clicks Start */
  readonly startWithImages = output<string[]>();

  /** Emits when user wants to go back to menu */
  readonly backToMenu = output<void>();

  /** Array of uploaded image data-URLs (null = empty slot) */
  protected readonly images = signal<(string | null)[]>([]);

  /** Track which slot is being filled (for the hidden file input) */
  private activeSlotIndex = 0;

  protected readonly allFilled = computed(() => {
    const imgs = this.images();
    return imgs.length === this.totalPairs() && imgs.every(img => img !== null);
  });

  /** Indices array for template iteration */
  protected readonly slots = computed(() => {
    const count = this.totalPairs();
    // Initialize images array if needed
    const current = this.images();
    if (current.length !== count) {
      this.images.set(new Array(count).fill(null));
    }
    return Array.from({ length: count }, (_, i) => i);
  });

  onSlotClick(index: number, fileInput: HTMLInputElement): void {
    this.activeSlotIndex = index;
    fileInput.value = ''; // reset so same file can be re-selected
    fileInput.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.images.update(imgs => {
        const copy = [...imgs];
        copy[this.activeSlotIndex] = dataUrl;
        return copy;
      });
    };
    reader.readAsDataURL(file);
  }

  onStart(): void {
    const imgs = this.images();
    if (this.allFilled()) {
      this.startWithImages.emit(imgs as string[]);
    }
  }

  onBack(): void {
    this.backToMenu.emit();
  }
}
