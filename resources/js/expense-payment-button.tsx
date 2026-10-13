import type { ButtonHTMLAttributes } from 'react';
import '../css/expense-payment-button.css';

export default function ExpensePaymentButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} type="button" className={'cg-payment-dollar ' + className}><span aria-hidden="true">$</span></button>;
}
