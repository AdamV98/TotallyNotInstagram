import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ContentService } from '../../services/content.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface IUser {
  _id: string;
  email: string;
  role: 'user' | 'influencer' | 'admin';
}

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
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profileUser: IUser | null = null;
  userPosts: IPost[] = [];
  errorMessage: string | null = null;
  isEditingProfile = false;
  updatedEmail = '';

  currentUserId: string | null = null;
  isViewingMyProfile = false;

  followersCount = 0;
  followingCount = 0;
  isFollowing = false;

  followersList: IFollower[] = [];
  followingList: IFollower[] = [];

  showFollowersList = false;
  showFollowingList = false;

  editingPost: IPost | null = null;
  updatedPostCaption = '';

  constructor(
    private route: ActivatedRoute,
    public authService: AuthService,
    private contentService: ContentService,
    public router: Router
  ) { }

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUser()?._id || null;
    this.route.params.subscribe(params => {
      const userIdFromRoute = params['userId'];
      if (userIdFromRoute) {
        this.isViewingMyProfile = this.currentUserId === userIdFromRoute;
        this.loadUserProfile(userIdFromRoute);
      } else {
        this.isViewingMyProfile = true;
        if (this.currentUserId) {
          this.loadUserProfile(this.currentUserId);
        } else {
          this.errorMessage = 'User not logged in.';
          this.router.navigate(['/login']);
        }
      }
    });
  }

  loadUserProfile(userId: string): void {
    this.errorMessage = null;
    this.authService.getUserById(userId).subscribe({
      next: (user) => {
        this.profileUser = user;
        this.updatedEmail = user.email;
        this.loadUserPosts(userId);
        this.loadFollowData(userId);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to load user profile.';
      }
    });
  }

  loadUserPosts(userId: string): void {
    this.contentService.getPostsByUser(userId).subscribe({
      next: (posts) => {
        this.userPosts = posts;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to load user posts.';
      }
    });
  }

  loadFollowData(userId: string): void {
    combineLatest([
      this.contentService.getFollowers(userId),
      this.contentService.getFollowing(userId)
    ]).subscribe({
      next: ([followers, following]) => {
        this.followersCount = followers.length;
        this.followingCount = following.length;
        this.followersList = followers;
        this.followingList = following;
        if (this.currentUserId) {
          this.isFollowing = followers.some(follow => follow.follower._id === this.currentUserId);
        }
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to load follow data.';
      }
    });
  }

  toggleEditProfile(): void {
    this.isEditingProfile = !this.isEditingProfile;
  }

  saveProfile(): void {
    if (!this.profileUser) {
      return;
    }
    const updates = { email: this.updatedEmail };
    this.authService.updateProfile(updates).subscribe({
      next: (updatedUser) => {
        this.profileUser = updatedUser;
        this.isEditingProfile = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to update profile.';
      }
    });
  }

  public cancelEditProfile(): void {
    this.isEditingProfile = false;
    this.updatedEmail = '';
    this.errorMessage = null;
  }

  public toggleFollow(): void {
    if (!this.currentUserId || !this.profileUser) {
      return;
    }
    this.errorMessage = null;
    if (this.isFollowing) {
      this.contentService.unfollowUser(this.profileUser._id).subscribe({
        next: () => {
          this.isFollowing = false;
          this.followersCount--;
          this.followersList = this.followersList.filter(follow => follow.follower._id !== this.currentUserId);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Failed to unfollow user.';
        }
      });
    } else {
      this.contentService.followUser(this.profileUser._id).subscribe({
        next: (response) => {
          this.isFollowing = true;
          this.followersCount++;
          this.followersList.push({
            _id: response._id,
            follower: {
              _id: this.currentUserId!,
              email: this.authService.getCurrentUser()?.email || '',
              role: this.authService.getCurrentUser()?.role || 'user'
            },
            following: {
              _id: this.profileUser!._id,
              email: this.profileUser!.email,
              role: this.profileUser!.role
            },
            createdAt: response.createdAt || new Date().toISOString()
          });
        },
        error: (error) => {
          this.errorMessage = error.message || 'Failed to follow user.';
        }
      });
    }
  }

  toggleShowFollowers(): void {
    this.showFollowersList = !this.showFollowersList;
    this.showFollowingList = false;
  }

  toggleShowFollowing(): void {
    this.showFollowingList = !this.showFollowingList;
    this.showFollowersList = false;
  }

  canEditDeletePost(post: IPost): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return false;
    }
    return post.user._id === currentUser._id || currentUser.role === 'admin';
  }

  startEditingPost(post: IPost): void {
    this.editingPost = post;
    this.updatedPostCaption = post.caption || '';
    this.errorMessage = null;
  }

  savePost(): void {
    if (!this.editingPost || !this.updatedPostCaption) {
      return;
    }
    this.errorMessage = null;
    const updates = { caption: this.updatedPostCaption };
    this.contentService.updatePost(this.editingPost._id, updates).subscribe({
      next: (updatedPost) => {
        const index = this.userPosts.findIndex(p => p._id === updatedPost._id);
        if (index !== -1) {
          this.userPosts[index].caption = updatedPost.caption;
        }
        this.cancelEditingPost();
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to update post.';
      }
    });
  }

  cancelEditingPost(): void {
    this.editingPost = null;
    this.updatedPostCaption = '';
    this.errorMessage = null;
  }

  deletePost(postId: string): void {
    if (confirm('Are you sure you want to delete this post and its content?')) {
      this.errorMessage = null;
      this.contentService.deletePost(postId).subscribe({
        next: (response) => {
          this.userPosts = this.userPosts.filter(post => post._id !== postId);
          this.cancelEditingPost();
        },
        error: (error) => {
          this.errorMessage = error.message || 'Failed to delete post.';
        }
      });
    }
  }

  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }
}
