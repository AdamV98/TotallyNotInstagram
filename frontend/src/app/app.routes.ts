import { Routes } from '@angular/router';
import { RegisterComponent } from './auth/register/register.component';
import { LoginComponent } from './auth/login/login.component';
import { FeedComponent } from './posts/feed/feed.component';
import { ProfileComponent } from './users/profile/profile.component';
import { UploadComponent } from './posts/upload/upload.component';
import { PostDetailComponent } from './posts/post-detail/post-detail.component';
import { UserManagementComponent } from './admin/user-management/user-management.component';
import { ModerationComponent } from './admin/moderation/moderation.component';
import { authGuard } from './auth.guard';
import { adminGuard } from './admin.guard'; 

export const routes: Routes = [
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },

  // Apply authGuard to routes that require ANY authenticated user
  { path: 'feed', component: FeedComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'upload', component: UploadComponent, canActivate: [authGuard] },
  { path: 'posts/:postId', component: PostDetailComponent, canActivate: [authGuard] },
  { path: 'users/:userId', component: ProfileComponent, canActivate: [authGuard] },

  // Apply adminGuard to routes that require an authenticated ADMIN user
  { path: 'admin/users', component: UserManagementComponent, canActivate: [adminGuard] },
  { path: 'admin/moderation', component: ModerationComponent, canActivate: [adminGuard] },

  { path: 'shared-posts/:postId', component: PostDetailComponent },

  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
