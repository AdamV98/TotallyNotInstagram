import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  user = {
    email: '',
    password: '',
    role: 'user'
  };
  confirmPassword = '';
  registrationSuccess = false;
  errorMessage: string | null = null;

  constructor(private authService: AuthService, private router: Router) { }

  onSubmit(): void {
    this.errorMessage = null;
    this.registrationSuccess = false;

    if (this.user.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.authService.register(this.user).subscribe({
      next: (response) => {
        console.log('Registration successful', response);
        this.registrationSuccess = true;
      },
      error: (error) => {
        console.error('Registration failed', error);
        this.errorMessage = error.error || 'Registration failed. Please try again.';
      }
    });
  }
}
