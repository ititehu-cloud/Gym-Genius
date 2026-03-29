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
      <div ref={ref} className="p-2 bg-white text-black font-sans w-full max-w-[450px] mx-auto min-h-fit border-0 shadow-none relative overflow-hidden print:p-0">
        {/* Header Section - Sarder Fitness */}
        <header className="flex justify-between items-start mb-1 border-b-[4px] border-black pb-1">
          <div className="flex items-center gap-2">
            {gymIconUrl ? (
                <img
                    src={gymIconUrl}
                    alt="Gym Logo"
                    className="h-10 w-10 rounded-full object-cover border-2 border-black"
                    crossOrigin="anonymous"
                />
            ) : (
                <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center">
                    <Dumbbell className="h-6 w-6 text-white" />
                </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-3xl font-black tracking-tighter text-black leading-none uppercase">{gymName || 'Sardar Fitness'}</h1>
              <div className="text-black font-bold mt-0.5">
                {gymPhone && <p className="text-sm">MOB: {gymPhone}</p>}
                {gymAddress && <p className="max-w-[200px] leading-tight uppercase text-[10px]">{gymAddress}</p>}
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            {isPaid && (
              <div className="text-3xl font-black text-black uppercase tracking-tighter border-[3px] border-black px-2 py-0.5 inline-block bg-white">PAID</div>
            )}
          </div>
        </header>

        {/* Info Grid */}
        <section className="grid grid-cols-1 gap-1 mb-1 mt-1">
          <div className="space-y-0.5">
            <div>
              <h2 className="text-xs font-black text-black uppercase tracking-widest border-b-[1px] border-black inline-block">BILLED TO</h2>
              <div className="text-black font-black text-3xl leading-none uppercase mt-0.5">{member.name}</div>
              <div className="text-black text-xs font-bold uppercase">{member.address}</div>
              <div className="text-black text-lg font-black mt-0.5">CONTACT: {member.mobileNumber || 'N/A'}</div>
              <div className="text-black text-5xl font-black mt-1 leading-none border-[3px] border-black p-1 inline-block">ID: {member.memberId}</div>
            </div>
          </div>
          <div className="flex justify-between items-end border-t-[2px] border-black pt-0.5">
            <div>
              <h2 className="text-xs font-black text-black uppercase tracking-widest">DATE</h2>
              <div className="text-black font-black text-lg">{format(parseISO(payment.paymentDate), 'MMM dd, yyyy')}</div>
            </div>
            <div className="text-right">
              <h2 className="text-xs font-black text-black uppercase tracking-widest">METHOD</h2>
              <div className="text-black font-black text-lg capitalize">{payment.paymentMethod}</div>
            </div>
          </div>
        </section>

        {/* Table Section */}
        <section className="mb-1">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black text-white">
                <th className="py-0.5 px-1 text-base font-black uppercase">DESC</th>
                <th className="py-0.5 px-1 text-right text-base font-black uppercase">AMT</th>
              </tr>
            </thead>
            <tbody className="divide-y-[1px] divide-black">
              {allPayments.length > 0 ? (
                allPayments.map(p => (
                  <tr key={p.id} className="border-x-[2px] border-black">
                    <td className="py-1 px-1">
                      <div className="text-black font-black text-lg capitalize">{p.paymentType}</div>
                    </td>
                    <td className="py-1 px-1 text-right">
                      <div className="text-black font-black text-3xl font-mono">₹{p.amount.toLocaleString()}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-x-[2px] border-black">
                  <td colSpan={2} className="py-2 text-center text-black font-black text-lg uppercase">No Transactions</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Totals Section */}
        <section className="flex justify-end">
          <div className="w-full">
            <div className="bg-black p-2 rounded-none flex justify-between items-center text-white">
              <span className="font-black text-xl uppercase">TOTAL</span>
              <span className="font-black text-6xl font-mono leading-none">₹{totalPaid.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-2 pt-1 text-center border-t-[3px] border-black">
          <p className="text-black font-black italic text-xl mb-0.5 uppercase">Thank you!</p>
          <p className="text-sm text-black uppercase font-black tracking-widest leading-tight">
            {gymName} {gymPhone && `| MOB: ${gymPhone}`}
          </p>
          <p className="text-[10px] text-black font-bold mt-0.5 uppercase opacity-80">Computer Generated Receipt</p>
        </footer>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';
