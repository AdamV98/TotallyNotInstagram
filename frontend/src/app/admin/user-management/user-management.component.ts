import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface IUser {
  _id: string;
  email: string;
  role: 'user' | 'influencer' | 'admin';
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: IUser[] = [];
  errorMessage: string | null = null;
  selectedUser: IUser | null = null;
  updatedUserRole: 'user' | 'influencer' | 'admin' = 'user';

  constructor(public authService: AuthService) { }

  ngOnInit(): void {
    if (this.authService.getCurrentUserRole() !== 'admin') {
        this.errorMessage = 'Access Denied: You must be an admin to view this page.';
        return;
    }
    this.loadAllUsers();
  }

  loadAllUsers(): void {
    this.errorMessage = null;
    this.authService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        console.log('Loaded all users (admin)', users);
      },
      error: (error) => {
        console.error('Error loading all users (admin)', error);
        this.errorMessage = error.message || 'Failed to load users.';
      }
    });
  }

  public selectUser(user: IUser): void {
      this.selectedUser = user;
      this.updatedUserRole = user.role;
      this.errorMessage = null;
  }

  public updateUserRole(): void {
      if (!this.selectedUser || !this.updatedUserRole) {
          return;
      }
      this.errorMessage = null;

      this.authService.updateUserRole(this.selectedUser._id, this.updatedUserRole).subscribe({
          next: (updatedUser) => {
              console.log('User role updated', updatedUser);
              const index = this.users.findIndex(u => u._id === updatedUser._id);
              if (index !== -1) {
                  this.users[index] = updatedUser;
              }
              this.selectedUser = null;
          },
          error: (error) => {
              console.error('Error updating user role', error);
              this.errorMessage = error.message || 'Failed to update user role.';
          }
      });
  }

  public deleteUser(userId: string): void {
      if (this.authService.getCurrentUser()?._id === userId) {
          this.errorMessage = 'You cannot delete your own account from here.';
          return;
      }

      if (confirm('Are you sure you want to delete this user and all their content?')) {
          this.errorMessage = null;
          this.authService.deleteUser(userId).subscribe({
              next: (response) => {
                  console.log('User deleted', response);
                  this.users = this.users.filter(u => u._id !== userId);
                  this.selectedUser = null;
              },
              error: (error) => {
                  console.error('Error deleting user', error);
                  this.errorMessage = error.message || 'Failed to delete user.';
              }
          });
      }
  }

  public cancelEditProfile(): void {
      this.selectedUser = null;
      this.updatedUserRole = 'user';
      this.errorMessage = null;
  }
}
