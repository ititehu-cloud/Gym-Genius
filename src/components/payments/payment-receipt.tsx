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
      <div ref={ref} className="p-2 max-w-2xl mx-auto bg-white text-black font-sans w-[750px] min-h-fit border-0 shadow-none relative overflow-hidden">
        {/* Header Section - Compact and Unified */}
        <header className="flex justify-between items-start mb-2 border-b-[12px] border-black pb-2">
          <div className="flex items-center gap-4">
            {gymIconUrl ? (
                <img
                    src={gymIconUrl}
                    alt="Gym Logo"
                    className="h-32 w-32 rounded-full object-cover border-4 border-black"
                    crossOrigin="anonymous"
                />
            ) : (
                <div className="h-32 w-32 rounded-full bg-black flex items-center justify-center">
                    <Dumbbell className="h-24 w-24 text-white" />
                </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-[100px] font-black tracking-tighter text-black leading-none uppercase">{gymName || 'Sardar Fitness'}</h1>
              <div className="text-black text-3xl font-black mt-1">
                {gymPhone && <p>MOB: {gymPhone}</p>}
                {gymAddress && <p className="max-w-[400px] leading-tight uppercase">{gymAddress}</p>}
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            {isPaid && (
              <div className="text-6xl font-black text-black uppercase tracking-tighter border-[12px] border-black px-6 py-2 inline-block bg-white">PAID</div>
            )}
          </div>
        </header>

        {/* Info Grid - Very Compact */}
        <section className="grid grid-cols-2 gap-4 mb-2 mt-2">
          <div className="space-y-2">
            <div>
              <h2 className="text-3xl font-black text-black uppercase tracking-widest border-b-4 border-black inline-block mb-1">BILLED TO</h2>
              <div className="text-black font-black text-6xl leading-none uppercase">{member.name}</div>
              <div className="text-black text-4xl font-bold mt-2 uppercase">{member.address}</div>
              <div className="text-black text-4xl font-black mt-2">CONTACT: {member.mobileNumber || 'N/A'}</div>
              {/* Member ID text increased 2x times as requested (from 70px to 140px) */}
              <div className="text-black text-[140px] font-black mt-4 leading-none border-4 border-black p-2 inline-block">MEMBER ID: {member.memberId}</div>
            </div>
          </div>
          <div className="text-right space-y-4">
            <div>
              <h2 className="text-3xl font-black text-black uppercase tracking-widest border-b-4 border-black inline-block mb-1">DATE</h2>
              <div className="text-black font-black text-5xl">{format(parseISO(payment.paymentDate), 'MMM dd, yyyy')}</div>
            </div>
            <div>
              <h2 className="text-3xl font-black text-black uppercase tracking-widest border-b-4 border-black inline-block mb-1">METHOD</h2>
              <div className="text-black font-black text-5xl capitalize">{payment.paymentMethod}</div>
            </div>
          </div>
        </section>

        {/* Table Section - Reduced padding */}
        <section className="mb-2">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black text-white">
                <th className="py-4 px-3 text-4xl font-black uppercase">DESCRIPTION</th>
                <th className="py-4 px-3 text-right text-4xl font-black uppercase">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y-[8px] divide-black">
              {allPayments.length > 0 ? (
                allPayments.map(p => (
                  <tr key={p.id} className="border-x-[4px] border-black">
                    <td className="py-6 px-3">
                      <div className="text-black font-black text-5xl capitalize">{p.paymentType}</div>
                    </td>
                    <td className="py-6 px-3 text-right">
                      <div className="text-black font-black text-6xl font-mono">₹{p.amount.toLocaleString()}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-x-[4px] border-black">
                  <td colSpan={2} className="py-10 text-center text-black font-black text-5xl uppercase">No Transactions</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Totals Section - Huge Highlight */}
        <section className="flex justify-end pt-1">
          <div className="w-full max-w-lg space-y-2">
            <div className="bg-black p-6 rounded-none flex justify-between items-center text-white">
              <span className="font-black text-5xl uppercase">TOTAL PAID</span>
              <span className="font-black text-[120px] font-mono leading-none">₹{totalPaid.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Footer - Final touch */}
        <footer className="mt-4 pt-4 text-center border-t-[12px] border-black">
          <p className="text-black font-black italic text-5xl mb-2 uppercase">Thank you!</p>
          <p className="text-4xl text-black uppercase font-black tracking-widest leading-tight">
            {gymName} {gymPhone && `| MOB: ${gymPhone}`}
          </p>
          <p className="text-2xl text-black font-bold mt-4 uppercase opacity-80">Computer Generated Thermal Receipt</p>
        </footer>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';
