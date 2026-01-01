import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { PaymentService } from './payment.service';
import { from } from 'rxjs/internal/observable/from';
import { tap } from 'rxjs/internal/operators/tap';
import { catchError, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/internal/Subject';
import { Observable } from 'rxjs/internal/Observable';

@Component({
  selector: 'app-payment-info',
  standalone: false,
  templateUrl: './payment-info.component.html',
  styleUrls: ['./payment-info.component.sass'],
})
export class PaymentInfoComponent implements OnInit, AfterViewInit {
  paymentForm: FormGroup = new FormGroup({
    cardHolderName: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
      Validators.pattern("^[A-Za-zÀ-ÖØ-öø-ÿ '\\.-]+$"),
    ]),
    // cardNumber/expiry/cvv are collected by Stripe Elements (secure) and must not be stored or sent to our server
    postalCode: new FormControl('', [
      Validators.required,
      Validators.maxLength(20),
    ]),
  });

  cardBrand: string = '';
  cardError: string | null = null;
  private stripe: any = null;
  private stripeCard: any = null;
  processing = false;
  paymentResultMessage = '';
  paymentSuccess: boolean | null = null;
  paymentStatus: string | undefined;
  transactionId: any;
  errorMessage: any;

  constructor(private paymentService: PaymentService) {}
  private destroy$ = new Subject<void>();
  ngOnInit(): void {}

  ngAfterViewInit(): void {
    const key = (window as any)['STRIPE_PUBLISHABLE_KEY'] || '';

    if (!key) {
      console.warn(
        'Stripe publishable key not set. Set window.STRIPE_PUBLISHABLE_KEY to initialize Stripe Elements.'
      );
      return;
    }

    this.loadStripeJs()
      .pipe(
        tap(() => {
          this.stripe = (window as any).Stripe(key);
        }),

        switchMap(() => this.initializeStripeElements()),

        tap(() => {
          const elements = this.stripe.elements();
          this.stripeCard = elements.create('card', { hidePostalCode: false });

          this.stripeCard.mount('#stripe-card-element');

          this.stripeCard.on('change', (ev: any) => {
            this.cardError = ev.error ? ev.error.message : null;
            this.cardBrand = ev.brand || '';
          });
        }),

        takeUntil(this.destroy$)
      )
      .subscribe();
  }
  private initializeStripeElements(): Observable<void> {
    return new Observable<void>((observer) => {
      // Since Stripe.js is already loaded in loadStripeJs, we can directly proceed
      observer.next();
      observer.complete();
    });
  }

  submitPayment() {
    if (!this.stripe || !this.stripeCard) {
      console.error('Stripe Elements not initialized; cannot create token.');
      this.paymentResultMessage = 'Payment system not initialized';
      this.paymentSuccess = false;
      return;
    }

    this.cardError = null;
    this.paymentResultMessage = '';
    this.paymentSuccess = null;
    this.processing = true;

    const name = this.paymentForm.value.cardHolderName;
    const postal = this.paymentForm.value.postalCode;

    interface StripeTokenResult {
      token?: { id: string };
      error?: { message: string };
    }
    from(this.stripe.createToken(this.stripeCard) as Promise<StripeTokenResult>)
      .pipe(
        takeUntil(this.destroy$),
        tap((result) => {
          if (result.error) {
            throw { type: 'token_error', message: result.error.message };
          }
        }),
        switchMap((result) => {
          const token = result && result.token ? result.token?.id : '';
          return this.paymentService.makePayment(token); // already an Observable
        }),
        tap((res) => {
          console.log('Payment response:', res);
          this.paymentStatus = 'success';
          //this.transactionId = res.transactionId;
        }),
        catchError((err) => {
          console.log('Payment error:', err);
          if (err.type === 'token_error') {
            this.cardError = err.message;
            this.paymentResultMessage =
              err.message || 'Card tokenization failed';
            this.paymentSuccess = false;
          } else {
            this.paymentStatus = 'failure';
            this.errorMessage = err?.error?.message || 'Payment failed';
          }
          return [];
        }),
        finalize(() => {
          this.processing = false;
        })
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStripeJs(): Observable<void> {
    return new Observable<void>((observer) => {
      // If Stripe is already loaded, complete immediately
      if ((window as any).Stripe) {
        observer.next();
        observer.complete();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';

      script.onload = () => {
        observer.next();
        observer.complete();
      };

      script.onerror = () => {
        observer.error(new Error('Failed to load Stripe.js'));
      };

      document.head.appendChild(script);

      // Cleanup logic if subscription is cancelled
      return () => {
        script.onload = null;
        script.onerror = null;
      };
    });
  }

  // card number/expiry/cvc inputs are handled by Stripe Elements; no local handlers
}
