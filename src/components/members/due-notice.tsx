'use client';

import React from 'react';
import type { Member, Plan } from '@/lib/types';
import { format, parseISO } from 'date-fns';

type DueNoticeProps = {
  member: Member;
  plan: Plan;
  gymName?: string | null;
};

const DueNotice = React.forwardRef<HTMLDivElement, DueNoticeProps>(
  ({ member, plan, gymName }, ref) => {
    return (
      <div ref={ref} className="p-4 bg-white text-black font-sans text-sm w-[350px] border border-black shadow-none">
        <p className="text-center font-bold text-lg mb-2 border-b border-black pb-1">
            <span role="img" aria-label="muscle">💪🏼</span> RENEWAL NOTICE <span role="img" aria-label="muscle">💪🏼</span>
        </p>

        <div className="space-y-2 mt-4">
            <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="font-bold">From:</span>
                <span>{gymName || 'Your Gym'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="font-bold">Customer:</span>
                <span className="uppercase">{member.name}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="font-bold">Member ID:</span>
                <span className="font-mono">{member.memberId}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="font-bold">Mobile:</span>
                <span>{member.mobileNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="font-bold">Expiry Date:</span>
                <span className="text-destructive font-bold">{format(parseISO(member.expiryDate), 'PPP')}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="font-bold">Plan:</span>
                <span>{plan.name}</span>
            </div>
            <div className="flex justify-between mt-2 pt-2 bg-black text-white p-2 rounded-sm">
                <span className="font-bold">Amount Due:</span>
                <span className="text-lg font-black">₹{plan.price}</span>
            </div>
        </div>

        <p className="mt-6 text-center text-xs italic">
            <span role="img" aria-label="pray">🙏</span> Please clear the due amount as early as possible to continue your membership.
        </p>
        <p className="text-center mt-2 font-bold uppercase tracking-widest text-[10px]">Thank you!</p>
      </div>
    );
  }
);

DueNotice.displayName = 'DueNotice';

export default DueNotice;
