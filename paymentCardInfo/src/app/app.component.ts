import { Component } from '@angular/core';
import { PaymentInfoComponent } from './payment-info/payment-info.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass'],
})
export class AppComponent {
  title = 'paymentCardInfo';
}
