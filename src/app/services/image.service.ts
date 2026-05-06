import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface UserImage {
  id: number;
  user_id: number;
  original_filename: string;
  stored_filename: string;
  url: string;
  file_size: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api';

  /** User's uploaded images list, kept in sync after each operation */
  readonly images = signal<UserImage[]>([]);

  /** Loading state for the gallery */
  readonly loading = signal(false);

  /** Fetches all images belonging to the authenticated user */
  loadUserImages(): void {
    this.loading.set(true);
    this.http.get<UserImage[]>(`${this.apiUrl}/images`).subscribe({
      next: (imgs) => {
        this.images.set(imgs);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load user images', err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Uploads a File to the backend.
   * The backend handles compression/resize, so we send the raw file.
   */
  uploadImage(file: File): Observable<UserImage> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<UserImage>(`${this.apiUrl}/images`, formData).pipe(
      tap((newImage) => {
        this.images.update((imgs) => [newImage, ...imgs]);
      })
    );
  }

  /** Deletes an image by ID */
  deleteImage(imageId: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.apiUrl}/images/${imageId}`)
      .pipe(
        tap(() => {
          this.images.update((imgs) => imgs.filter((img) => img.id !== imageId));
        })
      );
  }
}
