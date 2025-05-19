import { Component, OnInit } from '@angular/core';
import { ContentService } from '../../services/content.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { tap } from 'rxjs/operators';
import { combineLatest } from 'rxjs';

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

interface IFollower {
  _id: string;
  follower: { _id: string; email: string; role: string };
  following: { _id: string; email: string; role: string };
  createdAt: string;
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

  followingList: IFollower[] = [];

  constructor(private contentService: ContentService, private authService: AuthService) { }

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUser()?._id || null;
    this.loadFeedData();
  }

  loadFeedData(): void {
      this.errorMessage = null;

      this.contentService.getAllApprovedPosts().subscribe({
          next: (posts) => {
              this.posts = posts;
              console.log('Loaded approved posts', posts);

              if (this.currentUserId) {
                  this.loadFollowingList(this.currentUserId);
              }
          },
          error: (error) => {
              console.error('Error loading posts', error);
              this.errorMessage = error.message || 'Failed to load posts.';
          }
      });
  }

  loadFollowingList(userId: string): void {
      this.contentService.getFollowing(userId).subscribe({
          next: (following) => {
              this.followingList = following;
              console.log('Loaded following list', following);
          },
          error: (error) => {
              console.error('Error loading following list', error);
          }
      });
  }

  hasLiked(post: IPost): boolean {
      if (!this.currentUserId || !post.likes) {
          return false;
      }
      return post.likes.includes(this.currentUserId);
  }

  isFollowingUser(postUser: { _id: string; email: string; role: string }): boolean {
      if (!this.currentUserId || !this.followingList) {
          return false;
      }
      return this.followingList.some(follow => follow.following._id === postUser._id);
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

    public sharePost(post: IPost): void {
      if (!this.authService.isLoggedIn() || !post) {
          console.warn('User not logged in or post not loaded to share.');
          return;
      }
      console.log('Sharing post', post._id);

      this.contentService.sharePost(post._id).subscribe({
          next: (response) => {
              console.log('Post shared (count incremented)', response);
              post.shareCount = response.shareCount;
              const shareableUrl = `${window.location.origin}/shared-posts/${post._id}`;
              if (navigator.clipboard) {
                  navigator.clipboard.writeText(shareableUrl).then(() => {
                      alert('Shareable URL copied to clipboard!');
                  }, () => {
                      alert(`Shareable URL: ${shareableUrl}`);
                  });
              } else {
                  alert(`Shareable URL: ${shareableUrl}`);
              }
          },
          error: (error) => {
              console.error('Error sharing post', error);
              this.errorMessage = error.message || 'Failed to share post.';
          }
      });
  }
}
