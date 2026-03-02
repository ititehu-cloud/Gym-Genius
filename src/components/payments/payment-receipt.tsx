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
  gymPhone?: string;
};

export const PaymentReceipt = React.forwardRef<HTMLDivElement, PaymentReceiptProps>(
  ({ payment, member, allPayments, gymName, gymAddress, gymIconUrl, gymPhone }, ref) => {
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const isPaid = payment.status === 'paid';

    return (
      <div ref={ref} className="p-10 max-w-2xl mx-auto bg-white text-black font-sans text-sm w-[750px] min-h-[900px] border shadow-sm relative">
        {/* Header Section */}
        <header className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-4">
            {gymIconUrl ? (
                <img
                    src={gymIconUrl}
                    alt="Gym Logo"
                    className="h-14 w-14 rounded-full object-cover"
                    crossOrigin="anonymous"
                />
            ) : (
                <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
                    <Dumbbell className="h-8 w-8 text-white" />
                </div>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{gymName || 'Gym Genius'}</h1>
              <p className="text-gray-500 text-xs mt-1">
                {gymPhone && `Mob no. ${gymPhone} `}
                {gymAddress && gymAddress.split('\n')[0]}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black text-gray-800 tracking-tighter uppercase">RECEIPT</div>
            <div className="text-gray-400 font-mono text-sm tracking-wider">#{payment.id.slice(-6).toUpperCase()}</div>
            {isPaid && (
              <div className="mt-4 text-3xl font-black text-green-600 uppercase tracking-widest">PAID</div>
            )}
          </div>
        </header>

        <div className="h-px bg-gray-100 w-full mb-10" />

        {/* Info Grid */}
        <section className="grid grid-cols-2 gap-16 mb-12">
          <div className="space-y-4">
            <div>
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">BILLED TO</h2>
              <div className="text-gray-900 font-bold text-lg leading-tight">{member.name}</div>
              <div className="text-gray-500 text-sm mt-1">{member.address}</div>
              <div className="text-gray-500 text-sm">{member.mobileNumber}</div>
            </div>
          </div>
          <div className="text-right space-y-6">
            <div>
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">PAYMENT DATE</h2>
              <div className="text-gray-900 font-bold text-lg">{format(parseISO(payment.paymentDate), 'MMMM do, yyyy')}</div>
            </div>
            <div>
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">PAYMENT METHOD</h2>
              <div className="text-gray-900 font-bold text-lg capitalize">{payment.paymentMethod}</div>
            </div>
          </div>
        </section>

        {/* Table Section */}
        <section className="mb-10">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">DESCRIPTION</th>
                <th className="py-3 px-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allPayments.map(p => (
                <tr key={p.id}>
                  <td className="py-6 px-4">
                    <div className="text-gray-900 font-bold text-base capitalize">{p.paymentType} Payment</div>
                    <div className="text-gray-400 text-xs mt-0.5">{format(parseISO(p.paymentDate), 'MMM dd, yyyy')}</div>
                  </td>
                  <td className="py-6 px-4 text-right">
                    <div className="text-gray-900 font-bold text-base font-mono">₹{p.amount.toFixed(2)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Totals Section */}
        <section className="flex justify-end pt-6">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-sm px-4">
              <span className="text-gray-500 font-medium">Subtotal</span>
              <span className="text-gray-900 font-mono font-bold">₹{totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm px-4 border-b pb-3">
              <span className="text-gray-500 font-medium">Tax (0%)</span>
              <span className="text-gray-900 font-mono font-bold">₹0.00</span>
            </div>
            <div className="bg-gray-50 p-6 rounded-md flex justify-between items-center">
              <span className="text-gray-900 font-black text-xl">Total Paid</span>
              <span className="text-gray-900 font-black text-2xl font-mono">₹{totalPaid.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto pt-20 pb-4 text-center">
          <div className="h-px bg-gray-100 w-full mb-12" />
          <p className="text-gray-600 font-bold italic text-lg mb-2">Thank you for your business!</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">
            {gymName} | {gymPhone && `MOB NO. ${gymPhone} `} {gymAddress?.split('\n')[0]}
          </p>
        </footer>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';
