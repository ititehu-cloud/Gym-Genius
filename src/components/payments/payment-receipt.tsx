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
      <div ref={ref} className="p-6 bg-white text-black font-sans w-[500px] mx-auto border-0 shadow-none relative overflow-hidden print:p-0">
        {/* Header Section */}
        <header className="flex justify-between items-start mb-6 border-b-[6px] border-black pb-4">
          <div className="flex items-center gap-4 flex-1">
            {gymIconUrl ? (
                <div className="h-20 w-20 rounded-xl bg-white overflow-hidden flex-shrink-0 p-1 border-[3px] border-black flex items-center justify-center">
                    <img
                        src={gymIconUrl}
                        alt="Gym Logo"
                        className="h-full w-full object-contain"
                        crossOrigin="anonymous"
                    />
                </div>
            ) : (
                <div className="h-16 w-16 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="h-8 w-8 text-white" />
                </div>
            )}
            <div className="flex flex-col flex-1 ml-1 overflow-hidden">
              <h1 className="text-2xl font-black tracking-tighter text-black leading-none uppercase whitespace-nowrap">
                {gymName || 'Gym Name'}
              </h1>
              <div className="text-black font-bold mt-2 space-y-0.5">
                {gymPhone && <p className="text-[12px] uppercase">MOB: {gymPhone}</p>}
                {gymAddress && <p className="max-w-[240px] leading-tight uppercase text-[10px] opacity-90">{gymAddress}</p>}
              </div>
            </div>
          </div>
          
          {isPaid && (
            <div className="ml-4 flex-shrink-0">
              <div className="text-2xl font-black text-black uppercase tracking-tighter border-[5px] border-black px-3 py-1 bg-white rotate-[-5deg] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                PAID
              </div>
            </div>
          )}
        </header>

        {/* Billed To Section */}
        <section className="space-y-1 mb-8">
          <h2 className="text-[10px] font-black text-black uppercase tracking-widest border-b-[2px] border-black inline-block mb-2">BILLED TO</h2>
          <div className="text-black font-black text-4xl leading-tight uppercase">{member.name}</div>
          <div className="text-black text-xs font-bold uppercase opacity-80">{member.address}</div>
          <div className="text-black text-lg font-black pt-1">CONTACT: {member.mobileNumber || 'N/A'}</div>
          
          {/* Boxed ID Section */}
          <div className="mt-4 block">
            <div className="border-[5px] border-black px-6 py-2 inline-flex items-baseline gap-4 bg-white">
                <span className="text-3xl font-black tracking-tighter">ID:</span>
                <span className="text-6xl font-black font-mono leading-none">{member.memberId}</span>
            </div>
          </div>
        </section>

        {/* Date and Method */}
        <section className="flex justify-between items-end border-t-[4px] border-black pt-3 mb-6">
          <div>
            <h2 className="text-[10px] font-black text-black uppercase tracking-widest opacity-70">RECEIPT DATE</h2>
            <div className="text-black font-black text-2xl">{format(parseISO(payment.paymentDate), 'MMM dd, yyyy')}</div>
          </div>
          <div className="text-right">
            <h2 className="text-[10px] font-black text-black uppercase tracking-widest opacity-70">PAYMENT METHOD</h2>
            <div className="text-black font-black text-2xl capitalize">{payment.paymentMethod}</div>
          </div>
        </section>

        {/* Table Section */}
        <section className="mb-4">
          <table className="w-full text-left border-collapse border-[4px] border-black">
            <thead>
              <tr className="bg-black text-white">
                <th className="py-2 px-4 text-xs font-black uppercase tracking-widest border-r border-white/20">DESCRIPTION</th>
                <th className="py-2 px-4 text-right text-xs font-black uppercase tracking-widest">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {allPayments.length > 0 ? (
                allPayments.map(p => (
                  <tr key={p.id} className="border-b-[3px] border-black last:border-b-0">
                    <td className="py-4 px-4 border-r-[3px] border-black">
                      <div className="text-black font-black text-2xl capitalize">{p.paymentType}</div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="text-black font-black text-4xl font-mono">₹{p.amount.toLocaleString()}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-black font-black text-xl uppercase italic">No Transactions Found</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Grand Total Block */}
        <section className="mb-8">
          <div className="bg-black p-5 flex justify-between items-center text-white border-[4px] border-black">
            <span className="font-black text-2xl uppercase tracking-tighter">GRAND TOTAL</span>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">₹</span>
                <span className="text-6xl font-black font-mono leading-none">{totalPaid.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Footer Section */}
        <footer className="mt-8 pt-6 text-center border-t-[5px] border-black">
          <p className="text-black font-black italic text-3xl mb-1 uppercase leading-none tracking-tighter">STAY STRONG, STAY FIT!</p>
          <p className="text-lg text-black uppercase font-black tracking-widest leading-none mt-2">
            {gymName || 'Gym Genius'}
          </p>
          <p className="text-[9px] text-black font-bold mt-6 uppercase opacity-60 tracking-tight">COMPUTER GENERATED RECEIPT - VALID WITHOUT SIGNATURE</p>
        </footer>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';