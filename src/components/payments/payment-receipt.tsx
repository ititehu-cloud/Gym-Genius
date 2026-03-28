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
        {/* Header Section - Sardar Fitness at the top */}
        <header className="flex justify-between items-center mb-2 border-b-[16px] border-black pb-4">
          <div className="flex items-center gap-6">
            {gymIconUrl ? (
                <img
                    src={gymIconUrl}
                    alt="Gym Logo"
                    className="h-48 w-48 rounded-full object-cover border-8 border-black"
                    crossOrigin="anonymous"
                />
            ) : (
                <div className="h-48 w-48 rounded-full bg-black flex items-center justify-center">
                    <Dumbbell className="h-32 w-32 text-white" />
                </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-[100px] font-black tracking-tighter text-black leading-none uppercase">{gymName || 'Sardar Fitness'}</h1>
              <div className="text-black text-4xl font-black mt-1 space-y-1">
                {gymPhone && <p>MOB: {gymPhone}</p>}
                {gymAddress && <p className="max-w-[450px] leading-tight uppercase">{gymAddress}</p>}
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            {isPaid && (
              <div className="text-8xl font-black text-black uppercase tracking-tighter border-[20px] border-black px-10 py-4 inline-block rotate-[-5deg] bg-white">PAID</div>
            )}
          </div>
        </header>

        {/* Info Grid - Massive Text */}
        <section className="grid grid-cols-2 gap-10 mb-4 mt-4">
          <div className="space-y-4">
            <div>
              <h2 className="text-4xl font-black text-black uppercase tracking-widest border-b-8 border-black inline-block mb-2">BILLED TO</h2>
              <div className="text-black font-black text-8xl leading-none uppercase">{member.name}</div>
              <div className="text-black text-5xl font-bold mt-4 uppercase">{member.address}</div>
              <div className="text-black text-5xl font-black mt-4">CONTACT: {member.mobileNumber || 'N/A'}</div>
              {/* Member ID text increased 2x times as requested */}
              <div className="text-black text-[70px] font-black mt-6 leading-none border-2 border-black p-2 inline-block">MEMBER ID: {member.memberId}</div>
            </div>
          </div>
          <div className="text-right space-y-8">
            <div>
              <h2 className="text-4xl font-black text-black uppercase tracking-widest border-b-8 border-black inline-block mb-2">DATE</h2>
              <div className="text-black font-black text-6xl mt-2">{format(parseISO(payment.paymentDate), 'MMM dd, yyyy')}</div>
            </div>
            <div>
              <h2 className="text-4xl font-black text-black uppercase tracking-widest border-b-8 border-black inline-block mb-2">METHOD</h2>
              <div className="text-black font-black text-6xl mt-2 capitalize">{payment.paymentMethod}</div>
            </div>
          </div>
        </section>

        {/* Table Section - Removed Payment IDs for cleanliness */}
        <section className="mb-4">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black text-white">
                <th className="py-6 px-4 text-5xl font-black uppercase">DESCRIPTION</th>
                <th className="py-6 px-4 text-right text-5xl font-black uppercase">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y-[12px] divide-black">
              {allPayments.length > 0 ? (
                allPayments.map(p => (
                  <tr key={p.id} className="border-x-[6px] border-black">
                    <td className="py-10 px-4">
                      <div className="text-black font-black text-6xl capitalize">{p.paymentType} PAYMENT</div>
                    </td>
                    <td className="py-10 px-4 text-right">
                      <div className="text-black font-black text-8xl font-mono">₹{p.amount.toLocaleString()}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-x-[6px] border-black">
                  <td colSpan={2} className="py-16 text-center text-black font-black text-6xl uppercase">No Transaction Details</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Totals Section - Huge Highlight */}
        <section className="flex justify-end pt-2">
          <div className="w-full max-w-xl space-y-4">
            <div className="bg-black p-10 rounded-none flex justify-between items-center text-white">
              <span className="font-black text-7xl uppercase">TOTAL PAID</span>
              <span className="font-black text-[150px] font-mono leading-none">₹{totalPaid.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Footer - Compact and Strong */}
        <footer className="mt-8 pt-6 text-center border-t-[16px] border-black">
          <p className="text-black font-black italic text-6xl mb-4 uppercase">Thank you for your business!</p>
          <p className="text-5xl text-black uppercase font-black tracking-widest leading-tight">
            {gymName} {gymPhone && `| MOB: ${gymPhone}`}
          </p>
          <p className="text-3xl text-black font-bold mt-6 uppercase opacity-80">Computer Generated Thermal Receipt</p>
        </footer>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';
