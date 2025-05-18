import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

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

interface IFollower {
  _id: string;
  follower: { _id: string; email: string; role: string };
  following: { _id: string; email: string; role: string };
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  private baseUrl = 'http://localhost:5000/api/content';

  constructor(private http: HttpClient) { }

  uploadPost(file: File, caption?: string): Observable<IPost> {
    const formData = new FormData();
    formData.append('media', file);
    if (caption) {
      formData.append('caption', caption);
    }
    return this.http.post<IPost>(`${this.baseUrl}/upload`, formData, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  getAllApprovedPosts(): Observable<IPost[]> {
    return this.http.get<IPost[]>(`${this.baseUrl}`, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  getPostById(postId: string): Observable<IPost> {
    return this.http.get<IPost>(`${this.baseUrl}/${postId}`, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  getSharedPostById(postId: string): Observable<IPost> {
    return this.http.get<IPost>(`${this.baseUrl}/shared/${postId}`).pipe(
        catchError(this.handleError)
    );
  }

  updatePost(postId: string, updates: any): Observable<IPost> {
    return this.http.put<IPost>(`${this.baseUrl}/${postId}`, updates, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  deletePost(postId: string): Observable<string> {
    return this.http.delete(`${this.baseUrl}/${postId}`, { withCredentials: true, responseType: 'text' }).pipe(
       catchError(this.handleError)
    );
  }

  addComment(postId: string, text: string): Observable<IComment> {
    return this.http.post<IComment>(`${this.baseUrl}/${postId}/comment`, { text }, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  updateComment(commentId: string, text: string): Observable<IComment> {
    return this.http.put<IComment>(`${this.baseUrl}/comment/${commentId}`, { text }, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  deleteComment(commentId: string): Observable<string> {
    return this.http.delete(`${this.baseUrl}/comment/${commentId}`, { withCredentials: true, responseType: 'text' }).pipe(
       catchError(this.handleError)
    );
  }

  likePost(postId: string): Observable<{ _id: string; likes: number }> {
    return this.http.post<{ _id: string; likes: number }>(`${this.baseUrl}/${postId}/like`, {}, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  unlikePost(postId: string): Observable<{ _id: string; likes: number }> {
    return this.http.delete<{ _id: string; likes: number }>(`${this.baseUrl}/${postId}/unlike`, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  followUser(userIdToFollow: string): Observable<IFollower> {
    return this.http.post<IFollower>(`${this.baseUrl}/follow/${userIdToFollow}`, {}, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  unfollowUser(userIdToUnfollow: string): Observable<string> {
    return this.http.delete(`${this.baseUrl}/unfollow/${userIdToUnfollow}`, { withCredentials: true, responseType: 'text' }).pipe(
       catchError(this.handleError)
    );
  }

  getFollowers(userId: string): Observable<IFollower[]> {
    return this.http.get<IFollower[]>(`${this.baseUrl}/followers/${userId}`, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  getFollowing(userId: string): Observable<IFollower[]> {
    return this.http.get<IFollower[]>(`${this.baseUrl}/following/${userId}`, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  // --- Admin Content Moderation Methods ---
  // These methods require credentials (and backend authorization checks for admin role)

  moderatePost(postId: string, status: 'approved' | 'rejected'): Observable<IPost> {
    return this.http.put<IPost>(`${this.baseUrl}/${postId}/moderate`, { status }, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  getPendingModerationPosts(): Observable<IPost[]> {
    return this.http.get<IPost[]>(`${this.baseUrl}/pending-moderation`, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  getPostsByUser(userId: string): Observable<IPost[]> {
    return this.http.get<IPost[]>(`${this.baseUrl}/user/${userId}`, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  sharePost(postId: string): Observable<{ _id: string; shareCount: number }> {
    return this.http.post<{ _id: string; shareCount: number }>(`${this.baseUrl}/${postId}/share`, {}, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      console.error('An error occurred:', error.error.message);
    } else {
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    return throwError(() => new Error(error.error?.message || 'Something bad happened; please try again later.'));
  }
}
