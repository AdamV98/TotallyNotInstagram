import { Component, OnInit } from '@angular/core';
import { ContentService } from '../../services/content.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

// Define interface for Post (should match the one in content.service.ts)
interface IPost {
  _id: string;
  user: { _id: string; email: string; role: string };
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  likes: string[];
  comments: any[];
  shareCount: number;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './moderation.component.html',
  styleUrls: ['./moderation.component.css']
})
export class ModerationComponent implements OnInit {
  pendingPosts: IPost[] = [];
  errorMessage: string | null = null;

  constructor(public authService: AuthService, private contentService: ContentService) { }

  ngOnInit(): void {
    if (this.authService.getCurrentUserRole() !== 'admin') {
        this.errorMessage = 'Access Denied: You must be an admin to view this page.';
        return;
    }
    this.loadPendingPosts();
  }

  loadPendingPosts(): void {
    this.errorMessage = null;
    this.contentService.getPendingModerationPosts().subscribe({
      next: (posts) => {
        this.pendingPosts = posts;
        console.log('Loaded pending moderation posts (admin)', posts);
      },
      error: (error) => {
        console.error('Error loading pending moderation posts (admin)', error);
        this.errorMessage = error.message || 'Failed to load pending posts.';
      }
    });
  }

  moderatePost(postId: string, status: 'approved' | 'rejected'): void {
      this.errorMessage = null;
      this.contentService.moderatePost(postId, status).subscribe({
          next: (updatedPost) => {
              console.log('Post moderated', updatedPost);
              this.pendingPosts = this.pendingPosts.filter(post => post._id !== updatedPost._id);
          },
          error: (error) => {
              console.error('Error moderating post', error);
              this.errorMessage = error.message || 'Failed to moderate post.';
          }
      });
  }
}
