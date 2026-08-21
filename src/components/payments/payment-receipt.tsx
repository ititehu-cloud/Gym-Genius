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
      <div ref={ref} className="p-1 bg-white text-black font-sans w-full max-w-[450px] mx-auto border-0 shadow-none relative overflow-hidden print:p-0">
        {/* Header Section */}
        <header className="flex justify-between items-start mb-0.5 border-b-[4px] border-black pb-0.5">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {gymIconUrl ? (
                <div className="relative h-20 w-20 rounded-md bg-white overflow-hidden flex-shrink-0 p-1 border-2 border-black flex items-center justify-center">
                    <img
                        src={gymIconUrl}
                        alt="Gym Logo"
                        className="h-full w-full object-contain"
                        crossOrigin="anonymous"
                    />
                </div>
            ) : (
                <div className="h-12 w-12 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="h-6 w-6 text-white" />
                </div>
            )}
            <div className="flex flex-col flex-1 ml-2 min-w-0">
              <h1 className="text-xl md:text-2xl font-black tracking-tighter text-black leading-tight uppercase truncate whitespace-nowrap overflow-hidden">
                {gymName || 'Sardar Fitness'}
              </h1>
              <div className="text-black font-bold mt-1">
                {gymPhone && <p className="text-[12px]">MOB: {gymPhone}</p>}
                {gymAddress && <p className="max-w-[200px] leading-tight uppercase text-[10px] opacity-80 truncate">{gymAddress}</p>}
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end flex-shrink-0 ml-2">
            {isPaid && (
              <div className="text-xl font-black text-black uppercase tracking-tighter border-[3px] border-black px-2 py-0.5 inline-block bg-white">PAID</div>
            )}
          </div>
        </header>

        {/* Billed To Section */}
        <section className="grid grid-cols-1 gap-0.5 mb-1 mt-2">
          <div className="space-y-1">
            <div>
              <h2 className="text-[10px] font-black text-black uppercase tracking-widest border-b-[1px] border-black inline-block">BILLED TO</h2>
              <div className="text-black font-black text-3xl leading-none uppercase mt-1">{member.name}</div>
              <div className="text-black text-xs font-bold uppercase mt-0.5">{member.address}</div>
              <div className="text-black text-lg font-black mt-1">CONTACT: {member.mobileNumber || 'N/A'}</div>
              <div className="text-black text-4xl font-black mt-2 leading-none border-[3px] border-black p-1 inline-block font-mono">ID: {member.memberId}</div>
            </div>
          </div>
          
          {/* Date and Method */}
          <div className="flex justify-between items-end border-t-[2px] border-black pt-1 mt-2">
            <div>
              <h2 className="text-[10px] font-black text-black uppercase tracking-widest">DATE</h2>
              <div className="text-black font-black text-xl">{format(parseISO(payment.paymentDate), 'MMM dd, yyyy')}</div>
            </div>
            <div className="text-right">
              <h2 className="text-[10px] font-black text-black uppercase tracking-widest">METHOD</h2>
              <div className="text-black font-black text-xl capitalize">{payment.paymentMethod}</div>
            </div>
          </div>
        </section>

        {/* Table Section */}
        <section className="mb-1 mt-2">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black text-white">
                <th className="py-1 px-2 text-sm font-black uppercase">DESCRIPTION</th>
                <th className="py-1 px-2 text-right text-sm font-black uppercase">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y-[1px] divide-black">
              {allPayments.length > 0 ? (
                allPayments.map(p => (
                  <tr key={p.id} className="border-x-[2px] border-black">
                    <td className="py-1 px-2">
                      <div className="text-black font-black text-lg capitalize">{p.paymentType}</div>
                    </td>
                    <td className="py-1 px-2 text-right">
                      <div className="text-black font-black text-3xl font-mono">₹{p.amount.toLocaleString()}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-x-[2px] border-black">
                  <td colSpan={2} className="py-2 text-center text-black font-black text-lg uppercase">No Transactions Found</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Grand Total */}
        <section className="flex justify-end mt-1">
          <div className="w-full">
            <div className="bg-black p-2 rounded-none flex justify-between items-center text-white">
              <span className="font-black text-xl uppercase">GRAND TOTAL</span>
              <span className="font-black text-5xl font-mono leading-none">₹{totalPaid.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Footer Section */}
        <footer className="mt-4 pt-2 text-center border-t-[3px] border-black">
          <p className="text-black font-black italic text-2xl mb-1 uppercase leading-none tracking-tighter">Stay Strong, Stay Fit!</p>
          <p className="text-sm text-black uppercase font-black tracking-widest leading-tight truncate">
            {gymName} {gymPhone && `| MOB: ${gymPhone}`}
          </p>
          <p className="text-[9px] text-black font-bold mt-1 uppercase opacity-60">Computer Generated Receipt - No Signature Required</p>
        </footer>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';