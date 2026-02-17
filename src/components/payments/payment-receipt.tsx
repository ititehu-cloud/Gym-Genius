'use client';

import React from 'react';
import type { Payment, Member } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Dumbbell } from 'lucide-react';

type PaymentReceiptProps = {
  payment: Payment;
  member: Member;
  allPayments: Payment[];
  gymName?: string | null;
  gymAddress?: string;
  gymIconUrl?: string | null;
};

export const PaymentReceipt = React.forwardRef<HTMLDivElement, PaymentReceiptProps>(
  ({ payment, member, allPayments, gymName, gymAddress, gymIconUrl }, ref) => {
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    const isFullyPaid = allPayments.every(p => p.status === 'paid');
    const overallStatus = isFullyPaid ? 'paid' : 'pending';

    return (
      <div ref={ref} className="p-8 max-w-2xl mx-auto bg-white text-black font-sans text-sm w-[672px]">
        <header className="flex justify-between items-start mb-8 border-b pb-4">
          <div className="w-2/3">
            <div className="flex items-center gap-3 font-headline text-lg font-bold text-black">
              {gymIconUrl ? (
                  <img
                      src={gymIconUrl}
                      alt={`${gymName || 'Gym'} logo`}
                      width={32}
                      height={32}
                      className="rounded-full object-cover h-8 w-8 flex-shrink-0"
                      crossOrigin="anonymous"
                  />
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
            <div className={`mt-2 text-lg font-bold uppercase ${overallStatus === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
              {overallStatus}
            </div>
          </div>
        </header>

        <section className="mb-8">
          <div className="flex justify-between">
            <div className='space-y-1'>
              <h2 className="font-bold text-gray-500">BILLED TO</h2>
              <p>{member.name}</p>
              <p>{member.address}</p>
              <p>{member.mobileNumber}</p>
            </div>
            <div className="text-right space-y-1">
                <div>
                    <p className="font-bold text-gray-500">Payment Date</p>
                    <p>{format(parseISO(payment.paymentDate), 'PPP')}</p>
                </div>
                 <div>
                    <p className="font-bold text-gray-500">Payment Method</p>
                    <p className="capitalize">{payment.paymentMethod}</p>
                </div>
            </div>
          </div>
        </section>

        <section>
          <table className="w-full text-left mb-8 border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-500 uppercase text-xs">
                <th className="p-2 font-semibold">Description</th>
                <th className="p-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {allPayments.map(p => (
                <tr className="border-b" key={p.id}>
                    <td className="p-2">
                        <div className="capitalize">{p.paymentType} Payment</div>
                        <div className="text-xs text-gray-500">{format(parseISO(p.paymentDate), 'MMM dd, yyyy')}</div>
                    </td>
                    <td className="p-2 text-right">₹{p.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="flex justify-end">
          <div className="w-1/2">
            <table className="w-full">
              <tbody>
                <tr className="text-right">
                  <td className="p-2 text-gray-500">Subtotal</td>
                  <td className="p-2">₹{totalPaid.toFixed(2)}</td>
                </tr>
                <tr className="text-right">
                  <td className="p-2 text-gray-500">Tax (0%)</td>
                  <td className="p-2">₹0.00</td>
                </tr>
                <tr className="text-right font-bold text-lg bg-gray-100">
                  <td className="p-2">Total Paid</td>
                  <td className="p-2">₹{totalPaid.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <footer className="text-center mt-12 text-xs text-gray-400">
          <p>Thank you for your business!</p>
          <p className="mt-1">{gymName} | {gymAddress}</p>
        </footer>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';
