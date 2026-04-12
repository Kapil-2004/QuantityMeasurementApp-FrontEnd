import { Component, OnInit } from '@angular/core';
import { AppStateService } from '../../services/app-state.service';
import { QuantityService } from '../../services/quantity.service';
import { AuthService } from '../../services/auth.service';

const UNITS: any = {
  Length:      ['Feet', 'Inch', 'Yard', 'Centimeter'],
  Weight:      ['Kilogram', 'Gram', 'Pound'],
  Temperature: ['Celsius', 'Fahrenheit', 'Kelvin'],
  Volume:      ['Litre', 'Millilitre', 'Gallon'],
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  activeType = 'Length';
  units: string[] = UNITS['Length'];

  action = 'compare';
  availableActions = [
    { id: 'compare', label: 'Compare', disabled: false },
    { id: 'convert', label: 'Convert', disabled: false },
    { id: 'add', label: 'Add', disabled: false },
    { id: 'subtract', label: 'Subtract', disabled: false },
    { id: 'divide', label: 'Divide', disabled: false },
  ];

  q1 = { Value: 1, Unit: 'Feet', MeasurementType: 'Length' };
  q2 = { Value: 1, Unit: 'Feet', MeasurementType: 'Length' };
  targetUnit = 'Feet';

  loading = false;
  
  resultType = '';
  resultLabel = '';
  resultValue: any = null;
  resultUnit = '';

  history: any[] = [];

  constructor(
    private appState: AppStateService,
    private quantityService: QuantityService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.appState.activeType$.subscribe(type => {
      this.activeType = type;
      this.units = UNITS[type] || [];
      if (this.units.length > 0) {
        this.q1.Unit = this.units[0];
        this.q2.Unit = this.units[0];
        this.targetUnit = this.units[0];
      }
      this.q1.MeasurementType = type;
      this.q2.MeasurementType = type;
      
      this.updateActionAvailability();
    });

    if (this.authService.token) {
      this.loadRemoteHistory();
    }
  }

  updateActionAvailability() {
    const isTemp = this.activeType === 'Temperature';
    this.availableActions.forEach(a => {
      a.disabled = isTemp && (a.id === 'add' || a.id === 'subtract' || a.id === 'divide');
    });
    const currentAction = this.availableActions.find(a => a.id === this.action);
    if (currentAction?.disabled) {
      this.action = 'compare';
    }
  }

  setAction(act: string) {
    this.action = act;
    this.resultLabel = ''; 
  }

  getActionSymbol() {
    switch (this.action) {
      case 'add': return '+';
      case 'subtract': return '−';
      case 'divide': return '÷';
      case 'compare': return '⇄';
      default: return '?';
    }
  }

  onCalculate() {
    this.loading = true;
    this.resultLabel = '';
    
    let obs$;
    switch (this.action) {
      case 'compare': obs$ = this.quantityService.compare(this.q1, this.q2); break;
      case 'convert': obs$ = this.quantityService.convert(this.q1, this.targetUnit); break;
      case 'add': obs$ = this.quantityService.add(this.q1, this.q2); break;
      case 'subtract': obs$ = this.quantityService.subtract(this.q1, this.q2); break;
      case 'divide': obs$ = this.quantityService.divide(this.q1, this.q2); break;
      default: return;
    }

    obs$.subscribe({
      next: (res: any) => {
        this.loading = false;
        this.handleResult(res);
        this.pushLocalHistory(res);
      },
      error: (err) => {
        this.loading = false;
        this.resultType = 'error';
        this.resultLabel = 'Error';
        this.resultValue = err.error?.message || 'Calculation failed';
        this.resultUnit = '';
      }
    });
  }

  handleResult(res: any) {
    if (this.action === 'compare') {
      const equal = res.areEqual;
      this.resultType = equal ? 'equal' : 'not-equal';
      this.resultLabel = equal ? '✅ Equal' : '❌ Not Equal';
      this.resultValue = equal ? 'Quantities are equal' : 'Quantities are not equal';
      this.resultUnit = res.message || '';
    } else if (this.action === 'convert' || this.action === 'add' || this.action === 'subtract') {
      this.resultType = 'success';
      this.resultLabel = 'Result';
      this.resultValue = typeof res.result === 'number' ? this.fmt(res.result) : res.result;
      this.resultUnit = res.unit;
    } else if (this.action === 'divide') {
      this.resultType = 'success';
      this.resultLabel = 'Ratio';
      this.resultValue = this.fmt(res.result ?? res);
      this.resultUnit = '(dimensionless)';
    }
  }

  pushLocalHistory(res: any) {
    let resultText = '';
    if (this.action === 'convert' || this.action === 'add' || this.action === 'subtract') {
      resultText = `= ${this.fmt(res.result)} ${res.unit}`;
    } else if (this.action === 'compare') {
      resultText = res.areEqual ? '✅ Equal' : '❌ Not Equal';
    } else if (this.action === 'divide') {
      resultText = `= ${this.fmt(res.result ?? res)}`;
    }
    
    this.history.unshift({
      action: this.action,
      timestamp: new Date(),
      q1: { ...this.q1 },
      q2: this.action !== 'convert' ? { ...this.q2 } : null,
      targetUnit: this.action === 'convert' ? this.targetUnit : null,
      resultText
    });
  }

  loadRemoteHistory() {
    if (!this.authService.token) {
      window.alert('Please log in using the top-right button to Sync History.');
      return;
    }
    this.quantityService.getHistory().subscribe({
      next: (items) => {
        if (items && Array.isArray(items)) {
          // Just mapping a few back to local history for demo
          this.history = items.map(this.mapRemoteHistory).slice(0, 30);
        }
      }
    });
  }

  mapRemoteHistory(item: any) {
    const act = (item.operation || '').toLowerCase();
    return {
      action: act,
      timestamp: item.createdAt,
      q1: item.operand1 || {},
      q2: item.operand2 || {},
      targetUnit: '',
      resultText: item.hasError ? `⚠ ${item.errorMessage}` : `= ${item.result}`
    };
  }

  fmt(n: any) {
    if (typeof n !== 'number') return n;
    return Number.isInteger(n) ? n : parseFloat(n.toFixed(6));
  }
}
