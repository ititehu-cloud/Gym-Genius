'use client';

import React from 'react';
import type { Payment, Member, Plan } from '@/lib/types';
import { format, parseISO } from 'date-fns';

type PaymentReceiptProps = {
  payment: Payment;
  member: Member;
  allPayments: Payment[];
  dueAmount?: number;
  gymName?: string | null;
  gymAddress?: string;
  gymIconUrl?: string | null;
  gymPhone?: string;
  plan?: Plan;
};

export const PaymentReceipt = React.forwardRef<HTMLDivElement, PaymentReceiptProps>(
  ({ payment, member, allPayments, dueAmount, gymName, gymAddress, gymPhone, plan }, ref) => {
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const displayName = gymName || 'Gym Genius';

    return (
      <div 
        ref={ref} 
        id="receipt"
        style={{ 
          width: '400px', 
          margin: '0 auto', 
          fontFamily: 'Arial, sans-serif', 
          background: '#fff', 
          padding: '20px', 
          boxSizing: 'border-box',
          color: '#000'
        }}
      >
        <h2 style={{ textAlign: 'center', margin: '0', fontWeight: 'bold', textTransform: 'uppercase' }}>
          {displayName}
        </h2>
        <p style={{ textAlign: 'center', fontSize: '12px', margin: '0 0 10px', textTransform: 'uppercase' }}>
          {gymPhone && `MOB NO. ${gymPhone}`} {gymAddress && `${gymAddress}`}
        </p>

        <p style={{ fontWeight: 'bold', margin: '10px 0 0' }}>BILLED TO</p>
        <p style={{ fontWeight: 'bold', margin: '2px 0', textTransform: 'uppercase' }}>{member.name}</p>
        <p style={{ margin: '2px 0', textTransform: 'uppercase' }}>{member.address}</p>
        <p style={{ margin: '2px 0' }}>CONTACT: {member.mobileNumber || 'N/A'}</p>
        <p style={{ margin: '2px 0 10px' }}>ID: {member.memberId}</p>

        <div style={{ height: '1px', backgroundColor: '#000', width: '100%', margin: '10px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0' }}>
          <span style={{ fontWeight: 'bold' }}>MEMBERSHIP PLAN</span>
          <span style={{ fontWeight: 'bold' }}>PLAN PRICE</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ textTransform: 'uppercase' }}>{plan?.name || 'N/A'}</span>
          <span>₹{plan?.price.toLocaleString() || '0'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0 5px' }}>
          <span style={{ fontWeight: 'bold' }}>RECEIPT DATE</span>
          <span style={{ fontWeight: 'bold' }}>PAYMENT METHOD</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ textTransform: 'uppercase' }}>{format(parseISO(payment.paymentDate), 'MMM dd, yyyy')}</span>
          <span style={{ textTransform: 'capitalize' }}>{payment.paymentMethod}</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '10px 0' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #000', padding: '5px 0' }}>DESCRIPTION</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #000', padding: '5px 0' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {allPayments.map((p) => (
              <tr key={p.id}>
                <td style={{ textAlign: 'left', padding: '5px 0', textTransform: 'capitalize' }}>{p.paymentType}</td>
                <td style={{ textAlign: 'right', padding: '5px 0' }}>₹{p.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '2px solid #000', paddingTop: '5px' }}>
          <span>GRAND TOTAL</span>
          <span>₹{totalPaid.toLocaleString()}</span>
        </div>

        {dueAmount !== undefined && dueAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#dc2626', marginTop: '4px' }}>
            <span>TOTAL DUE</span>
            <span>₹{dueAmount.toLocaleString()}</span>
          </div>
        )}

        <p style={{ textAlign: 'center', fontWeight: 'bold', margin: '15px 0 0' }}>STAY STRONG, STAY FIT!</p>
        <p style={{ textAlign: 'center', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>{displayName}</p>
        <p style={{ textAlign: 'center', fontSize: '10px', margin: '10px 0 0', opacity: 0.7 }}>
          COMPUTER GENERATED RECEIPT - VALID WITHOUT SIGNATURE
        </p>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';