import { Component } from '@angular/core';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  measurementTypes = [
    { name: 'Length', icon: '📏' },
    { name: 'Weight', icon: '⚖️' },
    { name: 'Temperature', icon: '🌡️' },
    { name: 'Volume', icon: '🧪' }
  ];

  activeType = 'Length';

  constructor(private appState: AppStateService) {
    this.appState.activeType$.subscribe(type => {
      this.activeType = type;
    });
  }

  selectType(type: string) {
    this.appState.setActiveType(type);
  }
}
