import { Component, OnInit } from '@angular/core';
import { ContentService } from '../../services/content.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { tap } from 'rxjs/operators';

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
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css']
})
export class FeedComponent implements OnInit {
  posts: IPost[] = [];
  errorMessage: string | null = null;
  currentUserId: string | null = null;

  constructor(private contentService: ContentService, private authService: AuthService) { }

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUser()?._id || null;
    this.loadPosts();
  }

  loadPosts(): void {
    this.errorMessage = null;
    this.contentService.getAllApprovedPosts().subscribe({
      next: (posts) => {
        this.posts = posts;
        console.log('Loaded approved posts', posts);
      },
      error: (error) => {
        console.error('Error loading posts', error);
        this.errorMessage = error.message || 'Failed to load posts.'; // Access error.message
      }
    });
  }

  hasLiked(post: IPost): boolean {
      if (!this.currentUserId || !post.likes) {
          return false;
      }
      return post.likes.includes(this.currentUserId);
  }

  toggleLike(post: IPost): void {
      if (!this.currentUserId) {
          console.warn('User not logged in to like/unlike posts.');
          return;
      }

      this.errorMessage = null;

      if (this.hasLiked(post)) {
          this.contentService.unlikePost(post._id).subscribe({
              next: (response) => {
                  console.log('Post unliked', response);
                  post.likes = post.likes.filter(userId => userId !== this.currentUserId);
                  post.likes.length = response.likes;
              },
              error: (error) => {
                  console.error('Error unliking post', error);
                  this.errorMessage = error.message || 'Failed to unlike post.';
              }
          });
      } else {
          this.contentService.likePost(post._id).subscribe({
              next: (response) => {
                  console.log('Post liked', response);
                   post.likes = post.likes || [];
                   post.likes.push(this.currentUserId as string);
                   post.likes.length = response.likes;
              },
              error: (error) => {
                  console.error('Error liking post', error);
                  this.errorMessage = error.message || 'Failed to like post.';
              }
          });
      }
  }

    sharePost(post: IPost): void {
      if (!this.authService.isLoggedIn()) {
           console.warn('User not logged in to share posts.');
           return;
      }
      if (!post || !post._id) {
           console.warn('Post not loaded to share.');
           return;
      }
      console.log('Sharing post', post._id);

       this.contentService.sharePost(post._id).subscribe({
          next: (response) => {
              console.log('Post shared (count incremented)', response);
              post.shareCount = response.shareCount;

              const shareableUrl = `${window.location.origin}/shared-posts/${post._id}`;
              console.log('Shareable URL:', shareableUrl);
              alert(`Shareable URL: ${shareableUrl}`);
          },
          error: (error) => {
              console.error('Error sharing post', error);
              this.errorMessage = error.message || 'Failed to share post.';
          }
      });
  }
}
