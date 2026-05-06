import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { MediaLibraryComponent } from '../media-library/media-library.component';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-card-setup',
  templateUrl: './card-setup.component.html',
  styleUrls: ['./card-setup.component.scss'],
  imports: [MediaLibraryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardSetupComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly imageService = inject(ImageService);

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

  /** Upload state tracking */
  protected readonly isUploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);

  /** Whether the media library dialog is open */
  protected readonly showMediaLibrary = signal(false);
  protected readonly mediaLibraryMode = signal<'single' | 'multi'>('single');
  protected readonly mediaLibraryMax = signal<number>(1);

  /** Whether the user is logged in (controls media library availability) */
  protected readonly isLoggedIn = computed(() => this.authService.currentUser() !== null);

  protected readonly allFilled = computed(() => {
    const imgs = this.images();
    return imgs.length === this.totalPairs() && imgs.every(img => img !== null);
  });

  protected readonly filledCount = computed(() => {
    return this.images().filter(img => img !== null).length;
  });

  /** Indices array for template iteration */
  protected readonly slots = computed(() => {
    return Array.from({ length: this.totalPairs() }, (_, i) => i);
  });

  ngOnInit(): void {
    const count = this.totalPairs();
    this.images.set(new Array(count).fill(null));
  }

  onSlotClick(index: number, fileInput: HTMLInputElement): void {
    this.activeSlotIndex = index;

    if (this.isLoggedIn()) {
      // Open the media library dialog in single mode
      this.mediaLibraryMode.set('single');
      this.mediaLibraryMax.set(1);
      this.showMediaLibrary.set(true);
    } else {
      // Fallback to local file picker for anonymous users
      fileInput.value = '';
      fileInput.click();
    }
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

  onMultiFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fileArray = input?.files;

    if (fileArray == null || fileArray.length === 0) return;

    this.uploadError.set(null);

    if (this.isLoggedIn()) {
      this.isUploading.set(true);
      let pendingUploads = fileArray.length;
      let hasError = false;

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        if (!file || !file.type.startsWith('image/')) {
          pendingUploads--;
          if (pendingUploads === 0) {
            this.isUploading.set(false);
            if (hasError) this.uploadError.set('Algumas imagens falharam no upload.');
          }
          continue;
        }

        this.imageService.uploadImage(file).subscribe({
          next: (uploaded) => {
            this.images.update(imgs => {
              const copy = [...imgs];
              if (copy[i] !== undefined) {
                copy[i] = uploaded.url;
              }
              return copy;
            });
            pendingUploads--;
            if (pendingUploads === 0) {
              this.isUploading.set(false);
              if (hasError) this.uploadError.set('Algumas imagens falharam no upload.');
            }
          },
          error: (err) => {
            console.error('Upload failed for file', file.name, err);
            hasError = true;
            pendingUploads--;
            if (pendingUploads === 0) {
              this.isUploading.set(false);
              this.uploadError.set('Algumas imagens falharam no upload.');
            }
          }
        });
      }
    } else {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        if (!file || !file.type.startsWith('image/')) continue;
        
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          this.images.update(imgs => {
            const copy = [...imgs];
            if (copy[i] !== undefined) {
              copy[i] = dataUrl;
            }
            return copy;
          });
        };
        reader.readAsDataURL(file);
      }
    }
  }

  onMultiFileClick(fileInput: HTMLInputElement): void {
    if (this.isLoggedIn()) {
      const remainingSlots = this.totalPairs() - this.filledCount();
      if (remainingSlots > 0) {
        this.mediaLibraryMode.set('multi');
        this.mediaLibraryMax.set(remainingSlots);
        this.showMediaLibrary.set(true);
      }
    } else {
      fileInput.click();
    }
  }

  /** Called when images are selected from the media library */
  onMediaImagesSelected(urls: string[]): void {
    if (urls.length === 0) return;

    if (this.mediaLibraryMode() === 'single') {
      this.images.update(imgs => {
        const copy = [...imgs];
        copy[this.activeSlotIndex] = urls[0];
        return copy;
      });
    } else {
      this.images.update(imgs => {
        const copy = [...imgs];
        let urlIndex = 0;
        for (let i = 0; i < copy.length && urlIndex < urls.length; i++) {
          if (copy[i] === null) {
            copy[i] = urls[urlIndex];
            urlIndex++;
          }
        }
        return copy;
      });
    }
    this.showMediaLibrary.set(false);
  }

  onMediaLibraryClosed(): void {
    this.showMediaLibrary.set(false);
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
