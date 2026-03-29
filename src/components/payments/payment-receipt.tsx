
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
      <div ref={ref} className="p-4 bg-white text-black font-sans w-full max-w-[500px] mx-auto min-h-fit border-0 shadow-none relative overflow-hidden">
        {/* Header Section - Massive Gym Name */}
        <header className="flex justify-between items-start mb-2 border-b-[6px] border-black pb-2">
          <div className="flex items-center gap-4">
            {gymIconUrl ? (
                <img
                    src={gymIconUrl}
                    alt="Gym Logo"
                    className="h-16 w-16 rounded-full object-cover border-2 border-black"
                    crossOrigin="anonymous"
                />
            ) : (
                <div className="h-16 w-16 rounded-full bg-black flex items-center justify-center">
                    <Dumbbell className="h-10 w-10 text-white" />
                </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-5xl font-black tracking-tighter text-black leading-none uppercase">{gymName || 'Sardar Fitness'}</h1>
              <div className="text-black font-bold mt-1">
                {gymPhone && <p className="text-xl">MOB: {gymPhone}</p>}
                {gymAddress && <p className="max-w-[300px] leading-tight uppercase text-sm">{gymAddress}</p>}
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            {isPaid && (
              <div className="text-4xl font-black text-black uppercase tracking-tighter border-[6px] border-black px-4 py-1 inline-block bg-white">PAID</div>
            )}
          </div>
        </header>

        {/* Info Grid - Large details */}
        <section className="grid grid-cols-1 gap-4 mb-4 mt-2">
          <div className="space-y-2">
            <div>
              <h2 className="text-xl font-black text-black uppercase tracking-widest border-b-2 border-black inline-block">BILLED TO</h2>
              <div className="text-black font-black text-4xl leading-none uppercase mt-2">{member.name}</div>
              <div className="text-black text-lg font-bold mt-1 uppercase">{member.address}</div>
              <div className="text-black text-2xl font-black mt-2">CONTACT: {member.mobileNumber || 'N/A'}</div>
              <div className="text-black text-5xl font-black mt-3 leading-none border-4 border-black p-3 inline-block">ID: {member.memberId}</div>
            </div>
          </div>
          <div className="flex justify-between items-end border-t-2 border-black pt-2">
            <div>
              <h2 className="text-lg font-black text-black uppercase tracking-widest">DATE</h2>
              <div className="text-black font-black text-2xl">{format(parseISO(payment.paymentDate), 'MMM dd, yyyy')}</div>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-black text-black uppercase tracking-widest">METHOD</h2>
              <div className="text-black font-black text-2xl capitalize">{payment.paymentMethod}</div>
            </div>
          </div>
        </section>

        {/* Table Section */}
        <section className="mb-4">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black text-white">
                <th className="py-2 px-3 text-xl font-black uppercase">DESCRIPTION</th>
                <th className="py-2 px-3 text-right text-xl font-black uppercase">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y-[4px] divide-black">
              {allPayments.length > 0 ? (
                allPayments.map(p => (
                  <tr key={p.id} className="border-x-[2px] border-black">
                    <td className="py-3 px-3">
                      <div className="text-black font-black text-2xl capitalize">{p.paymentType}</div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="text-black font-black text-4xl font-mono">₹{p.amount.toLocaleString()}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-x-[2px] border-black">
                  <td colSpan={2} className="py-6 text-center text-black font-black text-2xl uppercase">No Transactions</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Totals Section */}
        <section className="flex justify-end pt-2">
          <div className="w-full space-y-2">
            <div className="bg-black p-4 rounded-none flex justify-between items-center text-white">
              <span className="font-black text-3xl uppercase">TOTAL PAID</span>
              <span className="font-black text-6xl font-mono leading-none">₹{totalPaid.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-6 pt-4 text-center border-t-[6px] border-black">
          <p className="text-black font-black italic text-3xl mb-2 uppercase">Thank you!</p>
          <p className="text-2xl text-black uppercase font-black tracking-widest leading-tight">
            {gymName} {gymPhone && `| MOB: ${gymPhone}`}
          </p>
          <p className="text-lg text-black font-bold mt-2 uppercase opacity-80">Computer Generated Thermal Receipt</p>
        </footer>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';
