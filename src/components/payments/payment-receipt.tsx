'use client';

import React from 'react';
import type { Payment, Member } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Dumbbell } from 'lucide-react';
import Image from 'next/image';

type PaymentReceiptProps = {
  payment: Payment;
  member: Member;
  gymName?: string | null;
  gymAddress?: string;
  gymIconUrl?: string | null;
};

export const PaymentReceipt = React.forwardRef<HTMLDivElement, PaymentReceiptProps>(
  ({ payment, member, gymName, gymAddress, gymIconUrl }, ref) => {
    return (
      <div ref={ref} className="p-8 max-w-2xl mx-auto bg-white text-black font-sans text-sm">
        <header className="flex justify-between items-start mb-8 border-b pb-4">
          <div className="w-2/3">
            <div className="flex items-center gap-2 font-headline text-lg font-bold text-black">
              {gymIconUrl ? (
                  <div className="relative h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                          src={gymIconUrl}
                          alt={`${gymName || 'Gym'} logo`}
                          fill
                          className="object-cover"
                          crossOrigin="anonymous"
                      />
                  </div>
              ) : (
                  <Dumbbell className="h-6 w-6 shrink-0" />
              )}
              <span>{gymName || 'Gym Genius'}</span>
            </div>
            <p className="text-xs mt-1">{gymAddress}</p>
          </div>
          <div className="w-1/3 text-right">
            <h1 className="text-2xl font-bold uppercase">Receipt</h1>
            <p className="text-xs">#{payment.invoiceNumber || payment.id.slice(-6).toUpperCase()}</p>
            <div className={`mt-2 text-lg font-bold uppercase ${payment.status === 'paid' ? 'text-chart-2' : 'text-destructive'}`}>
              {payment.status}
            </div>
          </div>
        </header>

        <section className="mb-8">
          <div className="flex justify-between">
            <div className='space-y-1'>
              <h2 className="font-bold text-gray-600">BILLED TO</h2>
              <p>{member.name}</p>
              <p>{member.address}</p>
              <p>{member.mobileNumber}</p>
            </div>
            <div className="text-right space-y-1">
                <div>
                    <p className="font-bold text-gray-600">Payment Date</p>
                    <p>{format(parseISO(payment.paymentDate), 'PPP')}</p>
                </div>
                 <div>
                    <p className="font-bold text-gray-600">Payment Method</p>
                    <p className="capitalize">{payment.paymentMethod}</p>
                </div>
            </div>
          </div>
        </section>

        <section>
          <table className="w-full text-left mb-8 border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
                <th className="p-2 font-semibold">Description</th>
                <th className="p-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2 capitalize">{payment.paymentType} Plan Payment</td>
                <td className="p-2 text-right">₹{payment.amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="flex justify-end">
          <div className="w-1/2">
            <table className="w-full">
              <tbody>
                <tr className="text-right">
                  <td className="p-2 text-gray-600">Subtotal</td>
                  <td className="p-2">₹{payment.amount.toFixed(2)}</td>
                </tr>
                <tr className="text-right">
                  <td className="p-2 text-gray-600">Tax (0%)</td>
                  <td className="p-2">₹0.00</td>
                </tr>
                <tr className="text-right font-bold text-lg bg-gray-100">
                  <td className="p-2">Total Paid</td>
                  <td className="p-2">₹{payment.amount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <footer className="text-center mt-12 text-xs text-gray-500">
          <p>Thank you for your business!</p>
          <p className="mt-1">{gymName} | {gymAddress}</p>
        </footer>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';
