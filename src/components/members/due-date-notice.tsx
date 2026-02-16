'use client';

import React from 'react';
import type { Member, Plan } from '@/lib/types';
import { format, parseISO } from 'date-fns';

type DueDateNoticeProps = {
  member: Member;
  plan: Plan;
  gymName: string | null;
};

export const DueDateNotice = React.forwardRef<HTMLDivElement, DueDateNoticeProps>(
  ({ member, plan, gymName }, ref) => {
    return (
      <div ref={ref} className="p-8 max-w-md mx-auto bg-white text-black font-sans" style={{width: '400px'}}>
        <div className="text-center mb-4">
            <span className="text-4xl">💪🏼</span>
            <h1 className="text-xl font-bold uppercase mt-2">*Due Details*</h1>
        </div>

        <div className="space-y-2 text-base">
            <p><span className="font-bold">*From:*</span> {gymName || 'Your Gym'}</p>
            <hr className="my-2 border-gray-300" />
            <p>
                <span className="inline-block w-6">👤</span>
                <span className="font-bold">*Customer:*</span> {member.name}
            </p>
            <p>
                <span className="inline-block w-6">📱</span>
                <span className="font-bold">*Mobile:*</span> {member.mobileNumber}
            </p>
             <p>
                <span className="inline-block w-6">📅</span>
                <span className="font-bold">*Date of Joining:*</span> {format(parseISO(member.joinDate), 'PPP')}
            </p>
            <p>
                <span className="inline-block w-6">📅</span>
                <span className="font-bold">*Date of Expiry:*</span> {format(parseISO(member.expiryDate), 'PPP')}
            </p>
            <p>
                <span className="inline-block w-6">💰</span>
                <span className="font-bold">*Plan Type:*</span> {plan.name}
            </p>
            <p className="text-lg">
                <span className="inline-block w-6">💵</span>
                <span className="font-bold">*Amount Due:*</span> ₹{plan.price}
            </p>
        </div>

        <footer className="text-center mt-6">
          <p className="font-semibold">
            🙏 Please clear the due amount at early as possible to continue your membership with the Gym.
          </p>
          <p className="mt-2">Thank you!</p>
        </footer>
      </div>
    );
  }
);

DueDateNotice.displayName = 'DueDateNotice';
