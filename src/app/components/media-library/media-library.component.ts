import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  output,
  OnInit,
  ElementRef,
  viewChild,
  input,
  computed,
} from '@angular/core';
import { ImageService, UserImage } from '../../services/image.service';

@Component({
  selector: 'app-media-library',
  templateUrl: './media-library.component.html',
  styleUrls: ['./media-library.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaLibraryComponent implements OnInit {
  private readonly imageService = inject(ImageService);

  readonly mode = input<'single' | 'multi'>('single');
  readonly maxSelection = input<number>(1);

  /** Emits the selected image URLs to the parent */
  readonly imagesSelected = output<string[]>();

  /** Emits when the dialog should close */
  readonly closed = output<void>();

  /** Active tab: 'upload' or 'gallery' */
  protected readonly activeTab = signal<'upload' | 'gallery'>('upload');

  /** User's uploaded images from the service */
  protected readonly images = this.imageService.images;

  /** Loading state from the service */
  protected readonly loading = this.imageService.loading;

  /** Global upload progress indicator */
  protected readonly isUploading = signal(false);

  /** Drag-over visual state */
  protected readonly isDragOver = signal(false);

  /** Error message for upload failures */
  protected readonly errorMessage = signal<string | null>(null);

  /** Set of selected image IDs for multi mode */
  protected readonly selectedImageIds = signal<Set<number>>(new Set());

  /** Whether gallery has images */
  protected readonly hasImages = computed(() => this.images().length > 0);

  /** Reference to the hidden file input */
  protected readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  ngOnInit(): void {
    this.imageService.loadUserImages();
  }

  setTab(tab: 'upload' | 'gallery'): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFiles(files);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fileArray = input.files;
    if (fileArray && fileArray.length > 0) {
      this.processFiles(fileArray);
    }
    input.value = '';
  }

  onUploadClick(): void {
    const inputEl = this.fileInputRef()?.nativeElement;
    if (inputEl) {
      inputEl.click();
    }
  }

  private processFiles(fileList: FileList): void {
    this.errorMessage.set(null);
    this.isUploading.set(true);

    let pending = fileList.length;
    let hasError = false;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith('image/')) {
        pending--;
        continue;
      }

      this.imageService.uploadImage(file).subscribe({
        next: (uploaded) => {
          if (this.mode() === 'single') {
            this.isUploading.set(false);
            this.imagesSelected.emit([uploaded.url]);
            return;
          }

          // Multi mode: auto-select
          this.selectedImageIds.update(set => {
            const newSet = new Set(set);
            if (newSet.size < this.maxSelection()) {
              newSet.add(uploaded.id);
            }
            return newSet;
          });

          pending--;
          if (pending === 0) {
            this.isUploading.set(false);
            this.setTab('gallery');
          }
        },
        error: (err) => {
          console.error('Upload failed', err);
          hasError = true;
          pending--;
          if (pending === 0) {
            this.isUploading.set(false);
            this.errorMessage.set('Falha em um ou mais uploads.');
          }
        },
      });
    }

    if (pending === 0 && !hasError) {
      this.isUploading.set(false);
    }
  }

  toggleSelection(img: UserImage): void {
    if (this.mode() === 'single') {
      this.imagesSelected.emit([img.url]);
      return;
    }

    // Multi mode
    this.selectedImageIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(img.id)) {
        newSet.delete(img.id);
      } else {
        if (newSet.size < this.maxSelection()) {
          newSet.add(img.id);
        }
      }
      return newSet;
    });
  }

  isSelected(id: number): boolean {
    return this.selectedImageIds().has(id);
  }

  confirmSelection(): void {
    const selectedUrls = this.images()
      .filter(img => this.selectedImageIds().has(img.id))
      .map(img => img.url);
    this.imagesSelected.emit(selectedUrls);
  }

  deleteImage(event: Event, img: UserImage): void {
    event.stopPropagation();
    this.imageService.deleteImage(img.id).subscribe({
      next: () => {
        this.selectedImageIds.update(set => {
          const newSet = new Set(set);
          newSet.delete(img.id);
          return newSet;
        });
      },
      error: (err) => console.error('Failed to delete image', err),
    });
  }

  close(): void {
    this.closed.emit();
  }
}
