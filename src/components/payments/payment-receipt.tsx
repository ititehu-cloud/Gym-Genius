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
        {/* Header Section - Massive Typography */}
        <header className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            {gymIconUrl ? (
                <img
                    src={gymIconUrl}
                    alt="Gym Logo"
                    className="h-32 w-32 rounded-full object-cover"
                    crossOrigin="anonymous"
                />
            ) : (
                <div className="h-32 w-32 rounded-full bg-primary flex items-center justify-center">
                    <Dumbbell className="h-20 w-20 text-white" />
                </div>
            )}
            <div>
              <h1 className="text-8xl font-black tracking-tighter text-gray-900 leading-none">{gymName || 'Gym Genius'}</h1>
              <div className="text-gray-900 text-3xl font-bold mt-2 space-y-0">
                {gymPhone && <p>Mob: {gymPhone}</p>}
                {gymAddress && <p className="max-w-[450px] leading-tight">{gymAddress}</p>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-8xl font-black text-gray-900 tracking-tighter uppercase leading-none">RECEIPT</div>
            <div className="text-gray-900 font-mono text-3xl font-black mt-2">#{payment.id.slice(-6).toUpperCase()}</div>
            {isPaid && (
              <div className="mt-4 text-8xl font-black text-green-800 uppercase tracking-tighter border-[12px] border-green-800 px-6 py-2 inline-block rotate-[-3deg]">PAID</div>
            )}
          </div>
        </header>

        <div className="h-4 bg-black w-full mb-6" />

        {/* Info Grid - Huge Text */}
        <section className="grid grid-cols-2 gap-8 mb-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-3xl font-black text-gray-700 uppercase tracking-widest">BILLED TO</h2>
              <div className="text-gray-900 font-black text-6xl leading-none mt-2">{member.name}</div>
              <div className="text-gray-800 text-3xl font-bold mt-2">{member.address}</div>
              <div className="text-gray-900 text-3xl font-black mt-2">Contact: {member.mobileNumber || 'N/A'}</div>
              <div className="text-gray-700 text-2xl font-bold mt-1">ID: {member.memberId}</div>
            </div>
          </div>
          <div className="text-right space-y-6">
            <div>
              <h2 className="text-3xl font-black text-gray-700 uppercase tracking-widest">DATE</h2>
              <div className="text-gray-900 font-black text-4xl mt-1">{format(parseISO(payment.paymentDate), 'MMM dd, yyyy')}</div>
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-700 uppercase tracking-widest">METHOD</h2>
              <div className="text-gray-900 font-black text-4xl mt-1 capitalize">{payment.paymentMethod}</div>
            </div>
          </div>
        </section>

        {/* Table Section - Maximum Legibility */}
        <section className="mb-6">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-200 border-b-8 border-black">
                <th className="py-4 px-4 text-3xl font-black text-gray-900 uppercase">DESCRIPTION</th>
                <th className="py-4 px-4 text-right text-3xl font-black text-gray-900 uppercase">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y-8 divide-gray-100">
              {allPayments.length > 0 ? (
                allPayments.map(p => (
                  <tr key={p.id}>
                    <td className="py-6 px-4">
                      <div className="text-gray-900 font-black text-4xl capitalize">{p.paymentType} Payment</div>
                      <div className="text-gray-700 text-2xl font-bold mt-1">Ref: {p.id.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td className="py-6 px-4 text-right">
                      <div className="text-gray-900 font-black text-6xl font-mono">₹{p.amount.toLocaleString()}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="py-10 text-center text-gray-400 font-black text-4xl">No Details</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Totals Section - Huge Highlight */}
        <section className="flex justify-end pt-4">
          <div className="w-full max-w-lg space-y-4">
            <div className="flex justify-between text-4xl px-4 font-black">
              <span className="text-gray-700">Subtotal</span>
              <span className="text-gray-900 font-mono">₹{totalPaid.toLocaleString()}</span>
            </div>
            <div className="bg-black p-6 rounded-none flex justify-between items-center text-white">
              <span className="font-black text-5xl">TOTAL PAID</span>
              <span className="font-black text-[120px] font-mono leading-none">₹{totalPaid.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Footer - Shortened to keep on one page */}
        <footer className="mt-8 pt-6 text-center border-t-8 border-gray-100">
          <p className="text-gray-900 font-black italic text-4xl mb-2">Thank you for your business!</p>
          <p className="text-3xl text-gray-600 uppercase font-black tracking-widest">
            {gymName} {gymPhone && `| MOB: ${gymPhone}`}
          </p>
          <p className="text-xl text-gray-400 font-bold mt-4 uppercase">Computer Generated Receipt</p>
        </footer>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';
