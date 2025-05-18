import { Component } from '@angular/core';
import { ContentService } from '../../services/content.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  selectedFile: File | null = null;
  caption = '';
  uploadSuccess = false;
  errorMessage: string | null = null;

  constructor(private contentService: ContentService, private router: Router, private authService: AuthService) { }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadSuccess = false;
      this.errorMessage = null;
    }
  }

  onSubmit(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file to upload.';
      return;
    }

    if (!this.authService.isLoggedIn()) {
        this.errorMessage = 'You must be logged in to upload posts.';
        return;
    }

    this.contentService.uploadPost(this.selectedFile, this.caption).subscribe({
      next: (response) => {
        console.log('Upload successful', response);
        this.uploadSuccess = true;
        this.selectedFile = null;
        this.caption = '';
      },
      error: (error) => {
        console.error('Upload failed', error);
        this.errorMessage = error.message || 'Upload failed. Please try again.';
      }
    });
  }
}
