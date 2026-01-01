import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';

export interface PaymentResult {
  success: boolean;
  message: string;
  transactionId?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private apiUrl = 'http://localhost:3000/api/payments';
  constructor(private http: HttpClient) {}

  makePayment(token: string): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.apiUrl}/charge`, { token });
  }
  // Simulate a POST to a payment API that accepts a token and returns success/failure
}
