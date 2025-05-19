import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

interface IUser {
  _id: string;
  email: string;
  role: 'user' | 'influencer' | 'admin';
}

interface ILoginResponse {
  _id: string;
  email: string;
  role: 'user' | 'influencer' | 'admin';
}

interface IRegisterResponse {
   _id: string;
  email: string;
  role: 'user' | 'influencer' | 'admin';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:5000/api/auth';
  private currentUserKey = 'currentUser';

  private currentUserSubject: BehaviorSubject<IUser | null>;
  public currentUser$: Observable<IUser | null>;

  constructor(private http: HttpClient) {
    this.currentUserSubject = new BehaviorSubject<IUser | null>(this.getCurrentUserFromStorage());
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  private storeUser(user: ILoginResponse | IRegisterResponse | IUser): void {
    localStorage.setItem(this.currentUserKey, JSON.stringify(user));
    this.currentUserSubject.next(user as IUser);
  }

  private getCurrentUserFromStorage(): IUser | null {
    const userString = localStorage.getItem(this.currentUserKey);
    return userString ? JSON.parse(userString) : null;
  }

   getCurrentUser(): IUser | null {
      return this.currentUserSubject.value;
   }

  public removeUser(): void {
    localStorage.removeItem(this.currentUserKey);
    this.currentUserSubject.next(null);
  }

  register(userData: any): Observable<IRegisterResponse> {
    return this.http.post<IRegisterResponse>(`${this.baseUrl}/register`, userData).pipe(
      catchError(this.handleError)
    );
  }

  login(credentials: any): Observable<ILoginResponse> {
  return this.http.post<ILoginResponse>(`${this.baseUrl}/login`, credentials, { withCredentials: true }).pipe(
    tap((response) => this.storeUser(response)),
    catchError(this.handleError)
  );
}

  logout(): Observable<string> {
    return this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true, responseType: 'text' }).pipe(
       tap(() => this.removeUser()),
       catchError(this.handleError)
    );
  }

  getProfile(): Observable<IUser> {
    return this.http.get<IUser>(`${this.baseUrl}/profile`, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  updateProfile(updates: any): Observable<IUser> {
    return this.http.put<IUser>(`${this.baseUrl}/profile`, updates, { withCredentials: true }).pipe( // Added withCredentials
       tap((updatedUser) => this.storeUser(updatedUser)),
       catchError(this.handleError)
    );
  }

  getUserById(userId: string): Observable<IUser> {
    return this.http.get<IUser>(`${this.baseUrl}/users/${userId}`, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  // --- Admin User Management Methods ---
  getAllUsers(): Observable<IUser[]> {
    return this.http.get<IUser[]>(`${this.baseUrl}/admin/users`, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  updateUserRole(userId: string, role: 'user' | 'influencer' | 'admin'): Observable<IUser> {
    return this.http.put<IUser>(`${this.baseUrl}/admin/users/${userId}`, { role }, { withCredentials: true }).pipe(
       catchError(this.handleError)
    );
  }

  deleteUser(userId: string): Observable<string> {
    return this.http.delete(`${this.baseUrl}/admin/users/${userId}`, { withCredentials: true, responseType: 'text' }).pipe(
       catchError(this.handleError)
    );
  }

  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

   getCurrentUserRole(): 'user' | 'influencer' | 'admin' | null {
       const user = this.currentUserSubject.value;
       return user ? user.role : null;
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
