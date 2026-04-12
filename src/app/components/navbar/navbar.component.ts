import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  showAuthModal = false;

  constructor(public authService: AuthService, private router: Router) {}

  openAuthModal() {
    this.showAuthModal = true;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  openHistory() {
    if (!this.authService.token) {
      this.openAuthModal();
      return;
    }
    // We will navigate to a history route, or open a history drawer
    // In original layout, history is on the side of dashboard. 
    // Wait, let's keep history in the same dashboard view for now or open a drawer
    this.router.navigate(['/'], { queryParams: { showHistory: true } });
  }
}
