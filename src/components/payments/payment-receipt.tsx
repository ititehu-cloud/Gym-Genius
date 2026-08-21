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
      <div 
        ref={ref} 
        className="p-8 bg-white text-black font-sans w-[500px] mx-auto border-0 shadow-none relative overflow-visible print:p-0"
        style={{ width: '500px' }}
      >
        {/* Header Section */}
        <header className="flex justify-between items-start mb-8 border-b-[6px] border-black pb-6">
          <div className="flex items-center gap-4 flex-1 overflow-hidden">
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
              <h1 className="text-2xl font-black tracking-tighter text-black leading-tight uppercase whitespace-nowrap overflow-hidden text-ellipsis">
                {gymName || 'Gym Name'}
              </h1>
              <div className="text-black font-bold mt-2 space-y-1">
                {gymPhone && <p className="text-[13px] uppercase">MOB: {gymPhone}</p>}
                {gymAddress && <p className="leading-tight uppercase text-[11px] opacity-90 break-words">{gymAddress}</p>}
              </div>
            </div>
          </div>
          
          {isPaid && (
            <div className="ml-4 flex-shrink-0 pt-2">
              <div className="w-20 h-20 rounded-full border-[6px] border-black flex items-center justify-center rotate-[-15deg] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                <span className="text-xl font-black text-black uppercase tracking-tighter">PAID</span>
              </div>
            </div>
          )}
        </header>

        {/* Billed To Section */}
        <section className="space-y-1 mb-8 overflow-visible">
          <h2 className="text-[11px] font-black text-black uppercase tracking-widest border-b-[2px] border-black inline-block mb-3">BILLED TO</h2>
          <div className="text-black font-black text-4xl leading-none uppercase mb-1">{member.name}</div>
          <div className="text-black text-[13px] font-bold uppercase opacity-80 mb-2">{member.address}</div>
          <div className="text-black text-lg font-black">CONTACT: {member.mobileNumber || 'N/A'}</div>
          
          {/* Boxed ID Section - Optimized for html2canvas */}
          <div className="mt-6 flex">
            <div className="border-[3px] border-black px-6 py-4 flex items-center gap-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] min-w-[300px]">
                <span className="text-3xl font-black tracking-tighter uppercase leading-none">ID:</span>
                <span className="text-6xl font-black font-mono leading-none tracking-tighter">{member.memberId}</span>
            </div>
          </div>
        </section>

        {/* Date and Method */}
        <section className="flex justify-between items-end border-t-[4px] border-black pt-4 mb-8">
          <div>
            <h2 className="text-[11px] font-black text-black uppercase tracking-widest opacity-70 mb-1">RECEIPT DATE</h2>
            <div className="text-black font-black text-2xl uppercase">{format(parseISO(payment.paymentDate), 'MMM dd, yyyy')}</div>
          </div>
          <div className="text-right">
            <h2 className="text-[11px] font-black text-black uppercase tracking-widest opacity-70 mb-1">PAYMENT METHOD</h2>
            <div className="text-black font-black text-2xl capitalize">{payment.paymentMethod}</div>
          </div>
        </section>

        {/* Table Section */}
        <section className="mb-6">
          <table className="w-full text-left border-collapse border-[4px] border-black">
            <thead>
              <tr className="bg-black text-white">
                <th className="py-2.5 px-4 text-xs font-black uppercase tracking-widest border-r border-white/20">DESCRIPTION</th>
                <th className="py-2.5 px-4 text-right text-xs font-black uppercase tracking-widest">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {allPayments.length > 0 ? (
                allPayments.map(p => (
                  <tr key={p.id} className="border-b-[3px] border-black last:border-b-0">
                    <td className="py-5 px-4 border-r-[3px] border-black">
                      <div className="text-black font-black text-2xl capitalize">{p.paymentType}</div>
                    </td>
                    <td className="py-5 px-4 text-right">
                      <div className="text-black font-black text-4xl font-mono">₹{p.amount.toLocaleString()}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="py-10 text-center text-black font-black text-xl uppercase italic">No Transactions Found</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Grand Total Block */}
        <section className="mb-10">
          <div className="bg-black p-6 flex justify-between items-center text-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
            <span className="font-black text-2xl uppercase tracking-tighter">GRAND TOTAL</span>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">₹</span>
                <span className="text-6xl font-black font-mono leading-none">{totalPaid.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Footer Section */}
        <footer className="mt-8 pt-8 text-center border-t-[5px] border-black">
          <p className="text-black font-black italic text-3xl mb-1 uppercase leading-none tracking-tighter">STAY STRONG, STAY FIT!</p>
          <p className="text-xl text-black uppercase font-black tracking-widest leading-none mt-2">
            {gymName || 'Gym Genius'}
          </p>
          <p className="text-[10px] text-black font-bold mt-8 uppercase opacity-60 tracking-tight">COMPUTER GENERATED RECEIPT - VALID WITHOUT SIGNATURE</p>
        </footer>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';
