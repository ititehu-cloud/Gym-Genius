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
      <div ref={ref} className="p-8 max-w-2xl mx-auto bg-white text-black font-sans text-sm w-[672px] border shadow-sm">
        <header className="flex justify-between items-start mb-8 border-b pb-6">
          <div className="w-2/3">
            <div className="flex items-center gap-3 font-headline text-xl font-bold text-black mb-1">
              {gymIconUrl ? (
                  <img
                      src={gymIconUrl}
                      alt={`${gymName || 'Gym'} logo`}
                      width={40}
                      height={40}
                      className="rounded-full object-cover h-10 w-10 flex-shrink-0"
                      crossOrigin="anonymous"
                  />
              ) : (
                  <Dumbbell className="h-8 w-8 shrink-0 text-primary" />
              )}
              <span>{gymName || 'Gym Genius'}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{gymAddress}</p>
          </div>
          <div className="w-1/3 text-right">
            <h1 className="text-3xl font-bold uppercase tracking-tighter text-gray-800">Receipt</h1>
            <p className="text-xs font-mono text-gray-500">#{payment.invoiceNumber || payment.id.slice(-6).toUpperCase()}</p>
            <div className={`mt-3 text-xl font-black uppercase tracking-widest ${overallStatus === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
              {overallStatus}
            </div>
          </div>
        </header>

        <section className="mb-10 grid grid-cols-2 gap-8">
          <div className='space-y-1.5'>
            <h2 className="font-bold text-[10px] tracking-widest text-gray-400 uppercase">BILLED TO</h2>
            <div className="text-gray-800 font-medium">{member.name}</div>
            <div className="text-xs text-gray-500 leading-tight">{member.address}</div>
            <div className="text-xs text-gray-500">{member.mobileNumber}</div>
          </div>
          <div className="text-right space-y-3">
              <div>
                  <p className="font-bold text-[10px] tracking-widest text-gray-400 uppercase">Payment Date</p>
                  <p className="text-gray-800 font-medium">{format(parseISO(payment.paymentDate), 'MMMM do, yyyy')}</p>
              </div>
               <div>
                  <p className="font-bold text-[10px] tracking-widest text-gray-400 uppercase">Payment Method</p>
                  <p className="text-gray-800 font-medium capitalize">{payment.paymentMethod}</p>
              </div>
          </div>
        </section>

        <section className="mb-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-t border-b">
                <th className="p-3 font-bold text-[10px] tracking-widest text-gray-400 uppercase">Description</th>
                <th className="p-3 text-right font-bold text-[10px] tracking-widest text-gray-400 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allPayments.map(p => (
                <tr key={p.id}>
                    <td className="p-4">
                        <div className="font-semibold text-gray-800 capitalize">{p.paymentType} Payment</div>
                        <div className="text-[10px] text-gray-400">{format(parseISO(p.paymentDate), 'MMM dd, yyyy')}</div>
                    </td>
                    <td className="p-4 text-right font-mono text-gray-800 font-semibold">₹{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="flex justify-end pt-4">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span>
              <span className="font-mono">₹{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 border-b pb-2">
              <span>Tax (0%)</span>
              <span className="font-mono">₹0.00</span>
            </div>
            <div className="flex justify-between items-center pt-2 font-black text-lg text-gray-900 bg-gray-50 p-2 rounded">
              <span>Total Paid</span>
              <span className="font-mono tracking-tight">₹{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </section>

        <footer className="text-center mt-16 pt-8 border-t">
          <p className="text-gray-500 font-medium italic mb-2">Thank you for your business!</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">{gymName} | {gymAddress?.split('\n')[0]}</p>
        </footer>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';
