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
      <div ref={ref} className="p-4 bg-white text-black font-sans text-sm w-[350px] border border-black">
        <p className="text-center font-bold text-lg mb-2">
            <span role="img" aria-label="muscle">💪🏼</span> Due Details <span role="img" aria-label="muscle">💪🏼</span>
        </p>

        <div className="space-y-1">
            <p><strong>From:</strong> {gymName || 'Your Gym'}</p>
            <p><span role="img" aria-label="user">👤</span> <strong>Customer:</strong> {member.name}</p>
            <p><span role="img" aria-label="phone">📱</span> <strong>Mobile:</strong> {member.mobileNumber}</p>
            <p><span role="img" aria-label="calendar">📅</span> <strong>Date of Joining:</strong> {format(parseISO(member.joinDate), 'PPP')}</p>
            <p><span role="img" aria-label="calendar">📅</span> <strong>Date of Expiry:</strong> {format(parseISO(member.expiryDate), 'PPP')}</p>
            <p><span role="img" aria-label="money bag">💰</span> <strong>Plan Type:</strong> {plan.name}</p>
            <p><span role="img" aria-label="money with wings">💵</span> <strong>Amount Due:</strong> ₹{plan.price}</p>
        </div>

        <p className="mt-3 text-center">
            <span role="img" aria-label="pray">🙏</span> Please clear the due amount as early as possible to continue your membership with the Gym.
        </p>
        <p className="text-center mt-1">Thank you!</p>
      </div>
    );
  }
);

DueNotice.displayName = 'DueNotice';

export default DueNotice;
