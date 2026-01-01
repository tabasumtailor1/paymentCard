import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PaymentService } from './payment.service';
import { PaymentInfoComponent } from './payment-info.component';

describe('PaymentInfoComponent', () => {
  let component: PaymentInfoComponent;
  let fixture: ComponentFixture<PaymentInfoComponent>;
  let paymentService: jest.Mocked<PaymentService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PaymentInfoComponent],
      providers: [
        { provide: PaymentService, useValue: { makePayment: jest.fn() } },
      ],
    });
    fixture = TestBed.createComponent(PaymentInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------
  // 1. Stripe NOT initialized → early return
  // ---------------------------------------------------------
  it('should stop and set error when stripe is not initialized', () => {
    component.stripe = null as any;
    component.stripeCard = null as any;

    component.submitPayment();

    expect(component.paymentResultMessage).toBe(
      'Payment system not initialized'
    );
    expect(component.paymentSuccess).toBe(false);
  });

  // ---------------------------------------------------------
  // 2. Tokenization error
  // ---------------------------------------------------------
  it('should handle tokenization error', async () => {
    component.stripe = {
      createToken: jest.fn().mockResolvedValue({
        error: { message: 'Invalid card' },
      }),
    } as any;

    component.stripeCard = {} as any;

    paymentService.makePayment.mockReturnValue(of({}));

    component.submitPayment();

    await Promise.resolve(); // allow microtask queue to flush

    expect(component.cardError).toBe('Invalid card');
    expect(component.paymentResultMessage).toBe('Invalid card');
    expect(component.paymentSuccess).toBe(false);
    expect(component.processing).toBe(false);
  });

  // ---------------------------------------------------------
  // 3. Successful payment
  // ---------------------------------------------------------
  it('should process payment successfully', async () => {
    component.stripe = {
      createToken: jest.fn().mockResolvedValue({
        token: { id: 'tok_123' },
      }),
    } as any;

    component.stripeCard = {} as any;

    paymentService.makePayment.mockReturnValue(
      of({ transactionId: 'txn_001' })
    );

    component.submitPayment();

    await Promise.resolve();

    expect(paymentService.makePayment).toHaveBeenCalledWith('tok_123');
    expect(component.paymentStatus).toBe('success');
    expect(component.processing).toBe(false);
  });

  // ---------------------------------------------------------
  // 4. Payment API error
  // ---------------------------------------------------------
  it('should handle payment API error', async () => {
    component.stripe = {
      createToken: jest.fn().mockResolvedValue({
        token: { id: 'tok_123' },
      }),
    } as any;

    component.stripeCard = {} as any;

    paymentService.makePayment.mockReturnValue(
      throwError(() => ({ error: { message: 'Payment failed' } }))
    );

    component.submitPayment();

    await Promise.resolve();

    expect(component.paymentStatus).toBe('failure');
    expect(component.errorMessage).toBe('Payment failed');
    expect(component.processing).toBe(false);
  });
});
