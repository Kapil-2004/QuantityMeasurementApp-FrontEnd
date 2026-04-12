import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

declare const google: any;

@Component({
  selector: 'app-auth-modal',
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.css']
})
export class AuthModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  isLogin = true;
  username = '';
  password = '';
  error = '';
  loading = false;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.initGoogleAuth();
  }

  toggleMode() {
    this.isLogin = !this.isLogin;
    this.error = '';
  }

  closeModal() {
    this.close.emit();
  }

  onSubmit() {
    if (!this.username || !this.password) {
      this.error = 'Please fill out all fields.';
      return;
    }
    
    this.loading = true;
    this.error = '';
    
    const request = this.isLogin
      ? this.authService.login({ Username: this.username, Password: this.password })
      : this.authService.register({ Username: this.username, Password: this.password });

    request.subscribe({
      next: () => {
        this.loading = false;
        this.closeModal();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || err.error?.title || 'Authentication failed.';
      }
    });
  }

  private initGoogleAuth() {
    if (typeof google === 'undefined') {
      setTimeout(() => this.initGoogleAuth(), 300);
      return;
    }
    
    google.accounts.id.initialize({
      client_id: "407408718192.apps.googleusercontent.com",
      callback: (response: any) => this.handleGoogleLogin(response.credential)
    });
    
    google.accounts.id.renderButton(
      document.getElementById('google-btn-container'),
      { theme: 'filled_black', size: 'large', text: 'continue_with', width: '320' }
    );
  }

  private handleGoogleLogin(token: string) {
    this.loading = true;
    this.authService.googleLogin(token).subscribe({
      next: () => {
        this.loading = false;
        this.closeModal();
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Google login failed.';
      }
    });
  }
}
