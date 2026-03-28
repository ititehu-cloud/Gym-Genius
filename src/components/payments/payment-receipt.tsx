
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
      <div ref={ref} className="p-4 max-w-2xl mx-auto bg-white text-black font-sans w-[750px] min-h-fit border-0 shadow-none relative">
        {/* Header Section - Compressed vertical space */}
        <header className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            {gymIconUrl ? (
                <img
                    src={gymIconUrl}
                    alt="Gym Logo"
                    className="h-24 w-24 rounded-full object-cover"
                    crossOrigin="anonymous"
                />
            ) : (
                <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center">
                    <Dumbbell className="h-14 w-14 text-white" />
                </div>
            )}
            <div>
              <h1 className="text-6xl font-black tracking-tighter text-gray-900 leading-none">{gymName || 'Gym Genius'}</h1>
              <div className="text-gray-900 text-2xl font-bold mt-1 space-y-0">
                {gymPhone && <p>Mob: {gymPhone}</p>}
                {gymAddress && <p className="max-w-[400px] leading-tight">{gymAddress}</p>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-6xl font-black text-gray-900 tracking-tighter uppercase leading-none">RECEIPT</div>
            <div className="text-gray-900 font-mono text-2xl font-black mt-1">#{payment.id.slice(-6).toUpperCase()}</div>
            {isPaid && (
              <div className="mt-2 text-7xl font-black text-green-800 uppercase tracking-tighter border-8 border-green-800 px-4 py-0 inline-block rotate-[-3deg]">PAID</div>
            )}
          </div>
        </header>

        <div className="h-2 bg-black w-full mb-6" />

        {/* Info Grid - Larger Text, Tighter Spacing */}
        <section className="grid grid-cols-2 gap-8 mb-6">
          <div className="space-y-2">
            <div>
              <h2 className="text-xl font-black text-gray-700 uppercase tracking-widest">BILLED TO</h2>
              <div className="text-gray-900 font-black text-4xl leading-none">{member.name}</div>
              <div className="text-gray-800 text-2xl font-bold mt-1">{member.address}</div>
              <div className="text-gray-900 text-2xl font-black mt-1">Contact: {member.mobileNumber || 'N/A'}</div>
              <div className="text-gray-700 text-lg font-bold mt-0.5">ID: {member.memberId}</div>
            </div>
          </div>
          <div className="text-right space-y-4">
            <div>
              <h2 className="text-xl font-black text-gray-700 uppercase tracking-widest">DATE</h2>
              <div className="text-gray-900 font-black text-3xl">{format(parseISO(payment.paymentDate), 'MMM dd, yyyy')}</div>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-700 uppercase tracking-widest">METHOD</h2>
              <div className="text-gray-900 font-black text-3xl capitalize">{payment.paymentMethod}</div>
            </div>
          </div>
        </section>

        {/* Table Section - Maximum Legibility */}
        <section className="mb-6">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-200 border-b-4 border-black">
                <th className="py-2 px-4 text-xl font-black text-gray-900 uppercase">DESCRIPTION</th>
                <th className="py-2 px-4 text-right text-xl font-black text-gray-900 uppercase">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-gray-100">
              {allPayments.length > 0 ? (
                allPayments.map(p => (
                  <tr key={p.id}>
                    <td className="py-4 px-4">
                      <div className="text-gray-900 font-black text-3xl capitalize">{p.paymentType} Payment</div>
                      <div className="text-gray-700 text-lg font-bold">Ref: {p.id.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="text-gray-900 font-black text-4xl font-mono">₹{p.amount.toLocaleString()}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="py-10 text-center text-gray-400 font-black text-2xl">No Details</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Totals Section - Huge Highlight */}
        <section className="flex justify-end pt-4">
          <div className="w-96 space-y-2">
            <div className="flex justify-between text-2xl px-4 font-black">
              <span className="text-gray-700">Subtotal</span>
              <span className="text-gray-900 font-mono">₹{totalPaid.toLocaleString()}</span>
            </div>
            <div className="bg-black p-4 rounded-none flex justify-between items-center text-white">
              <span className="font-black text-3xl">TOTAL</span>
              <span className="font-black text-7xl font-mono">₹{totalPaid.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Footer - Shortened to keep on one page */}
        <footer className="mt-6 pt-4 text-center border-t-4 border-gray-100">
          <p className="text-gray-900 font-black italic text-3xl mb-1">Thank you for your business!</p>
          <p className="text-lg text-gray-600 uppercase font-black tracking-widest">
            {gymName} {gymPhone && `| MOB: ${gymPhone}`}
          </p>
          <p className="text-sm text-gray-400 font-bold mt-2">COMPUTER GENERATED RECEIPT</p>
        </footer>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';
