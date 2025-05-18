import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ContentService } from '../../services/content.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { tap } from 'rxjs/operators';

interface IPost {
  _id: string;
  user: { _id: string; email: string; role: string };
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  likes: string[];
  comments: IComment[];
  shareCount: number;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface IComment {
  _id: string;
  user: { _id: string; email: string; role: string };
  post: string;
  text: string;
  createdAt: string;
}

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.css']
})
export class PostDetailComponent implements OnInit {
  post: IPost | null = null;
  newCommentText = '';
  errorMessage: string | null = null;
  currentUserId: string | null = null;

  editingComment: IComment | null = null;
  updatedCommentText = '';

  isSharedView = false;

  constructor(
    private route: ActivatedRoute,
    private contentService: ContentService,
    public authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
     this.currentUserId = this.authService.getCurrentUser()?._id || null;
    this.isSharedView = this.route.snapshot.url.some(segment => segment.path === 'shared-posts');


    this.route.params.subscribe(params => {
      const postId = params['postId'];
      if (postId) {
        if (this.isValidObjectId(postId)) {
            if (this.isSharedView) {
                 this.loadSharedPostDetail(postId);
            } else {
                 this.loadPostDetail(postId);
            }
        } else {
            console.error('Invalid Post ID format:', postId);
            this.errorMessage = 'Invalid post ID.';
        }
      } else {
          this.errorMessage = 'Post ID is missing.';
      }
    });
  }

  loadPostDetail(postId: string): void {
    this.errorMessage = null;
    this.contentService.getPostById(postId).subscribe({
      next: (post) => {
        this.post = post;
        console.log('Loaded post detail (authenticated)', post);
      },
      error: (error) => {
        console.error('Error loading post detail (authenticated)', error);
        this.errorMessage = error.message || 'Failed to load post details.';
      }
    });
  }

   loadSharedPostDetail(postId: string): void {
        this.errorMessage = null;
        this.contentService.getSharedPostById(postId).subscribe({
            next: (post) => {
                this.post = post;
                console.log('Loaded shared post detail (unauthenticated)', post);
            },
            error: (error) => {
                console.error('Error loading shared post detail (unauthenticated)', error);
                this.errorMessage = error.message || 'Failed to load shared post details.';
            }
        });
   }


  addComment(): void {
    if (!this.newCommentText || !this.post) {
      return;
    }

    this.contentService.addComment(this.post._id, this.newCommentText).subscribe({
      next: (comment) => {
        console.log('Comment added', comment);
        if (this.post) {
             this.post.comments.push(comment);
             this.newCommentText = '';
        }
      },
      error: (error) => {
        console.error('Error adding comment', error);
        this.errorMessage = error.message || 'Failed to add comment.';
      }
    });
  }

  canEditDeleteComment(comment: IComment): boolean {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
          return false;
      }
      return comment.user._id === currentUser._id || currentUser.role === 'admin';
  }

  startEditingComment(comment: IComment): void {
      this.editingComment = comment;
      this.updatedCommentText = comment.text;
      this.errorMessage = null;
  }

  saveComment(): void {
      if (!this.editingComment || !this.updatedCommentText) {
          return;
      }
      this.errorMessage = null;

      this.contentService.updateComment(this.editingComment._id, this.updatedCommentText).subscribe({
          next: (updatedComment) => {
              console.log('Comment updated', updatedComment);
              if (this.post) {
                  const index = this.post.comments.findIndex(c => c._id === updatedComment._id);
                  if (index !== -1) {
                      this.post.comments[index] = updatedComment;
                  }
              }
              this.cancelEditingComment();
          },
          error: (error) => {
              console.error('Error updating comment', error);
              this.errorMessage = error.message || 'Failed to update comment.';
          }
      });
  }

  cancelEditingComment(): void {
      this.editingComment = null;
      this.updatedCommentText = '';
      this.errorMessage = null;
  }

  deleteComment(commentId: string): void {
      if (confirm('Are you sure you want to delete this comment?')) {
          this.errorMessage = null;
          this.contentService.deleteComment(commentId).subscribe({
              next: (response) => {
                  console.log('Comment deleted', response);
                  if (this.post) {
                      this.post.comments = this.post.comments.filter(comment => comment._id !== commentId);
                  }
                   this.cancelEditingComment();
              },
              error: (error) => {
                  console.error('Error deleting comment', error);
                  this.errorMessage = error.message || 'Failed to delete comment.';
              }
          });
      }
  }

  hasLiked(post: IPost): boolean {
      if (!this.currentUserId || !post.likes) {
          return false;
      }
      return post.likes.includes(this.currentUserId);
  }

  toggleLike(): void {
      if (!this.currentUserId || !this.post) {
          console.warn('User not logged in or post not loaded to like/unlike.');
          return;
      }

      this.errorMessage = null;

      if (this.hasLiked(this.post)) {
          this.contentService.unlikePost(this.post._id).subscribe({
              next: (response) => {
                  console.log('Post unliked', response);
                  if (this.post) {
                      this.post.likes = this.post.likes.filter(userId => userId !== this.currentUserId);
                      this.post.likes.length = response.likes;
                  }
              },
              error: (error) => {
                  console.error('Error unliking post', error);
                  this.errorMessage = error.message || 'Failed to unlike post.';
              }
          });
      } else {
          this.contentService.likePost(this.post._id).subscribe({
              next: (response) => {
                  console.log('Post liked', response);
                   if (this.post) {
                      this.post.likes = this.post.likes || [];
                      this.post.likes.push(this.currentUserId as string);
                      this.post.likes.length = response.likes;
                   }
              },
              error: (error) => {
                  console.error('Error liking post', error);
                  this.errorMessage = error.message || 'Failed to like post.';
              }
          });
      }
  }

  sharePost(): void {
      if (!this.authService.isLoggedIn() || !this.post) {
           console.warn('User not logged in or post not loaded to share.');
           return;
      }
      console.log('Sharing post', this.post._id);

       this.contentService.sharePost(this.post._id).subscribe({
          next: (response) => {
              console.log('Post shared (count incremented)', response);
              if (this.post) {
                  this.post.shareCount = response.shareCount;
              }
              const shareableUrl = `${window.location.origin}/shared-posts/${this.post?._id}`;
              console.log('Shareable URL:', shareableUrl);
              alert(`Shareable URL: ${shareableUrl}`);
          },
          error: (error) => {
              console.error('Error sharing post', error);
              this.errorMessage = error.message || 'Failed to share post.';
          }
      });
  }

  private isValidObjectId(id: string): boolean {
      return /^[0-9a-fA-F]{24}$/.test(id);
  }

  public canEditDeletePost(post: IPost): boolean {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
          return false;
      }
      return post.user._id === currentUser._id || currentUser.role === 'admin';
  }

  public deletePost(postId: string): void {
      if (confirm('Are you sure you want to delete this post and its content?')) {
          this.errorMessage = null;
          this.contentService.deletePost(postId).subscribe({
              next: (response) => {
                  console.log('Post deleted', response);
                  this.router.navigate(['/feed']);
              },
              error: (error) => {
                  console.error('Error deleting post', error);
                  this.errorMessage = error.message || 'Failed to delete post.';
              }
          });
      }
  }

  // TODO: Implement logic to view followers/following lists
}
