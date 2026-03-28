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
        {/* Header Section - Massive Typography, Adjusted for Thermal */}
        <header className="flex justify-between items-center mb-4 border-b-[12px] border-black pb-4">
          <div className="flex items-center gap-6">
            {gymIconUrl ? (
                <img
                    src={gymIconUrl}
                    alt="Gym Logo"
                    className="h-40 w-40 rounded-full object-cover border-4 border-black"
                    crossOrigin="anonymous"
                />
            ) : (
                <div className="h-40 w-40 rounded-full bg-black flex items-center justify-center">
                    <Dumbbell className="h-24 w-24 text-white" />
                </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-8xl font-black tracking-tighter text-black leading-none uppercase">{gymName || 'Sardar Fitness'}</h1>
              <div className="text-black text-4xl font-black mt-2 space-y-1">
                {gymPhone && <p>MOB: {gymPhone}</p>}
                {gymAddress && <p className="max-w-[450px] leading-tight uppercase">{gymAddress}</p>}
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div className="text-black font-mono text-4xl font-black">ID: #{payment.id.slice(-6).toUpperCase()}</div>
            {isPaid && (
              <div className="text-7xl font-black text-black uppercase tracking-tighter border-[16px] border-black px-8 py-3 inline-block rotate-[-5deg] bg-white">PAID</div>
            )}
          </div>
        </header>

        {/* Info Grid - Huge Text */}
        <section className="grid grid-cols-2 gap-10 mb-8 mt-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-4xl font-black text-black uppercase tracking-widest border-b-4 border-black inline-block">BILLED TO</h2>
              <div className="text-black font-black text-7xl leading-none mt-4 uppercase">{member.name}</div>
              <div className="text-black text-4xl font-bold mt-4 uppercase">{member.address}</div>
              <div className="text-black text-4xl font-black mt-4">CONTACT: {member.mobileNumber || 'N/A'}</div>
              <div className="text-black text-3xl font-bold mt-2">MEMBER ID: {member.memberId}</div>
            </div>
          </div>
          <div className="text-right space-y-8">
            <div>
              <h2 className="text-4xl font-black text-black uppercase tracking-widest border-b-4 border-black inline-block">DATE</h2>
              <div className="text-black font-black text-5xl mt-2">{format(parseISO(payment.paymentDate), 'MMM dd, yyyy')}</div>
            </div>
            <div>
              <h2 className="text-4xl font-black text-black uppercase tracking-widest border-b-4 border-black inline-block">METHOD</h2>
              <div className="text-black font-black text-5xl mt-2 capitalize">{payment.paymentMethod}</div>
            </div>
          </div>
        </section>

        {/* Table Section - Maximum Legibility for Thermal */}
        <section className="mb-8">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black text-white">
                <th className="py-6 px-4 text-4xl font-black uppercase">DESCRIPTION</th>
                <th className="py-6 px-4 text-right text-4xl font-black uppercase">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y-[8px] divide-black">
              {allPayments.length > 0 ? (
                allPayments.map(p => (
                  <tr key={p.id} className="border-x-[4px] border-black">
                    <td className="py-8 px-4">
                      <div className="text-black font-black text-5xl capitalize">{p.paymentType} PAYMENT</div>
                      <div className="text-black text-3xl font-bold mt-2">REF: {p.id.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td className="py-8 px-4 text-right">
                      <div className="text-black font-black text-7xl font-mono">₹{p.amount.toLocaleString()}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-x-[4px] border-black">
                  <td colSpan={2} className="py-12 text-center text-black font-black text-5xl uppercase">No Transaction Details</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Totals Section - Huge Highlight */}
        <section className="flex justify-end pt-4">
          <div className="w-full max-w-xl space-y-6">
            <div className="flex justify-between text-5xl px-4 font-black text-black">
              <span className="uppercase">Subtotal</span>
              <span className="font-mono">₹{totalPaid.toLocaleString()}</span>
            </div>
            <div className="bg-black p-8 rounded-none flex justify-between items-center text-white">
              <span className="font-black text-6xl uppercase">TOTAL PAID</span>
              <span className="font-black text-[140px] font-mono leading-none">₹{totalPaid.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Footer - Compact and Strong */}
        <footer className="mt-12 pt-8 text-center border-t-[12px] border-black">
          <p className="text-black font-black italic text-5xl mb-4 uppercase">Thank you for your business!</p>
          <p className="text-4xl text-black uppercase font-black tracking-widest leading-tight">
            {gymName} {gymPhone && `| MOB: ${gymPhone}`}
          </p>
          <p className="text-2xl text-black font-bold mt-6 uppercase opacity-70">Computer Generated Thermal Receipt</p>
        </footer>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';
