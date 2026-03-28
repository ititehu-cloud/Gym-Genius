
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
      <div ref={ref} className="p-8 max-w-2xl mx-auto bg-white text-black font-sans text-lg w-[750px] min-h-[950px] border shadow-sm relative">
        {/* Header Section */}
        <header className="flex justify-between items-start mb-12">
          <div className="flex items-center gap-6">
            {gymIconUrl ? (
                <img
                    src={gymIconUrl}
                    alt="Gym Logo"
                    className="h-20 w-20 rounded-full object-cover"
                    crossOrigin="anonymous"
                />
            ) : (
                <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center">
                    <Dumbbell className="h-12 w-12 text-white" />
                </div>
            )}
            <div>
              <h1 className="text-4xl font-black tracking-tight text-gray-900">{gymName || 'Gym Genius'}</h1>
              <div className="text-gray-700 text-lg mt-2 space-y-1">
                {gymPhone && <p className="font-bold">Mob: {gymPhone}</p>}
                {gymAddress && <p className="max-w-[300px] leading-tight">{gymAddress}</p>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-black text-gray-900 tracking-tighter uppercase">RECEIPT</div>
            <div className="text-gray-600 font-mono text-xl tracking-wider mt-1">#{payment.id.slice(-6).toUpperCase()}</div>
            {isPaid && (
              <div className="mt-6 text-6xl font-black text-green-700 uppercase tracking-widest border-4 border-green-700 px-4 py-1 inline-block rotate-[-5deg] opacity-80">PAID</div>
            )}
          </div>
        </header>

        <div className="h-1 bg-gray-900 w-full mb-12" />

        {/* Info Grid */}
        <section className="grid grid-cols-2 gap-16 mb-16">
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-2">BILLED TO</h2>
              <div className="text-gray-900 font-black text-2xl leading-tight">{member.name}</div>
              <div className="text-gray-700 text-lg mt-2">{member.address}</div>
              <div className="text-gray-900 text-xl font-bold mt-2">Contact: {member.mobileNumber || 'N/A'}</div>
              <div className="text-gray-600 text-base mt-1 italic">Member ID: {member.memberId}</div>
            </div>
          </div>
          <div className="text-right space-y-8">
            <div>
              <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-1">PAYMENT DATE</h2>
              <div className="text-gray-900 font-black text-2xl">{format(parseISO(payment.paymentDate), 'MMMM do, yyyy')}</div>
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-1">PAYMENT METHOD</h2>
              <div className="text-gray-900 font-black text-2xl capitalize">{payment.paymentMethod}</div>
            </div>
          </div>
        </section>

        {/* Table Section */}
        <section className="mb-12">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-4 px-6 text-sm font-black text-gray-600 uppercase tracking-widest">DESCRIPTION</th>
                <th className="py-4 px-6 text-right text-sm font-black text-gray-600 uppercase tracking-widest">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-100">
              {allPayments.length > 0 ? (
                allPayments.map(p => (
                  <tr key={p.id}>
                    <td className="py-8 px-6">
                      <div className="text-gray-900 font-black text-xl capitalize">{p.paymentType} Membership Payment</div>
                      <div className="text-gray-600 text-base mt-1">Transaction Ref: {p.id.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td className="py-8 px-6 text-right">
                      <div className="text-gray-900 font-black text-2xl font-mono">₹{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="py-16 text-center text-gray-400 italic text-xl">No transaction details available</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Totals Section */}
        <section className="flex justify-end pt-10">
          <div className="w-80 space-y-4">
            <div className="flex justify-between text-lg px-6">
              <span className="text-gray-600 font-bold">Subtotal</span>
              <span className="text-gray-900 font-mono font-black">₹{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-lg px-6 border-b-2 border-gray-100 pb-4">
              <span className="text-gray-600 font-bold">Tax (0%)</span>
              <span className="text-gray-900 font-mono font-black">₹0.00</span>
            </div>
            <div className="bg-gray-900 p-8 rounded-lg flex justify-between items-center text-white">
              <span className="font-black text-2xl">TOTAL PAID</span>
              <span className="font-black text-4xl font-mono">₹{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto pt-24 pb-6 text-center">
          <div className="h-1 bg-gray-100 w-full mb-10" />
          <p className="text-gray-900 font-black italic text-2xl mb-4">Thank you for your business!</p>
          <p className="text-sm text-gray-500 uppercase tracking-[0.3em] font-bold">
            {gymName} {gymPhone && `| MOB: ${gymPhone}`}
          </p>
          <p className="text-xs text-gray-400 mt-4 uppercase tracking-widest">Computer Generated Receipt</p>
        </footer>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';
