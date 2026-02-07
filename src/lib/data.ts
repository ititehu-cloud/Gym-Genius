import { subMonths, addMonths, format, subDays, addDays } from 'date-fns';
import type { Member, Plan, Payment } from './types';
import { PlaceHolderImages } from './placeholder-images';

const today = new Date();

export const plans: Plan[] = [
  { id: 'plan-1', name: 'Monthly', duration: 1, price: 50 },
  { id: 'plan-2', name: 'Quarterly', duration: 3, price: 135 },
  { id: 'plan-3', name: 'Annual', duration: 12, price: 500 },
];

export const members: Member[] = [
  { id: 'mem-1', name: 'Alicia Rodriguez', mobileNumber: '111-222-3333', address: '123 Main St, Anytown', imageUrl: PlaceHolderImages[0].imageUrl, planId: 'plan-2', joinDate: format(subMonths(today, 5), 'yyyy-MM-dd'), expiryDate: format(addMonths(today, 1), 'yyyy-MM-dd'), status: 'active' },
  { id: 'mem-2', name: 'David Chen', mobileNumber: '222-333-4444', address: '456 Oak Ave, Anytown', imageUrl: PlaceHolderImages[1].imageUrl, planId: 'plan-1', joinDate: format(subMonths(today, 1), 'yyyy-MM-dd'), expiryDate: format(addDays(today, 5), 'yyyy-MM-dd'), status: 'active' },
  { id: 'mem-3', name: 'Priya Sharma', mobileNumber: '333-444-5555', address: '789 Pine Ln, Anytown', imageUrl: PlaceHolderImages[2].imageUrl, planId: 'plan-3', joinDate: format(subMonths(today, 11), 'yyyy-MM-dd'), expiryDate: format(addMonths(today, 1), 'yyyy-MM-dd'), status: 'active' },
  { id: 'mem-4', name: 'Michael Johnson', mobileNumber: '444-555-6666', address: '101 Maple Dr, Anytown', imageUrl: PlaceHolderImages[3].imageUrl, planId: 'plan-1', joinDate: format(subMonths(today, 2), 'yyyy-MM-dd'), expiryDate: format(subDays(today, 10), 'yyyy-MM-dd'), status: 'expired' },
  { id: 'mem-5', name: 'Chloe Kim', mobileNumber: '555-666-7777', address: '212 Birch Ct, Anytown', imageUrl: PlaceHolderImages[4].imageUrl, planId: 'plan-2', joinDate: format(subMonths(today, 4), 'yyyy-MM-dd'), expiryDate: format(subDays(today, 2), 'yyyy-MM-dd'), status: 'due' },
  { id: 'mem-6', name: 'Samuel Green', mobileNumber: '666-777-8888', address: '333 Cedar Rd, Anytown', imageUrl: PlaceHolderImages[5].imageUrl, planId: 'plan-1', joinDate: format(subMonths(today, 0), 'yyyy-MM-dd'), expiryDate: format(addMonths(today, 1), 'yyyy-MM-dd'), status: 'active' },
];

export const payments: Payment[] = [
  { id: 'pay-1', memberId: 'mem-1', amount: 135, date: format(subMonths(today, 2), 'yyyy-MM-dd'), status: 'paid' },
  { id: 'pay-2', memberId: 'mem-2', amount: 50, date: format(subMonths(today, 1), 'yyyy-MM-dd'), status: 'paid' },
  { id: 'pay-3', memberId: 'mem-3', amount: 500, date: format(subMonths(today, 11), 'yyyy-MM-dd'), status: 'paid' },
  { id: 'pay-4', memberId: 'mem-4', amount: 50, date: format(subMonths(today, 2), 'yyyy-MM-dd'), status: 'paid' },
  { id: 'pay-5', memberId: 'mem-5', amount: 135, date: format(subMonths(today, 1), 'yyyy-MM-dd'), status: 'pending' },
  { id: 'pay-6', memberId: 'mem-6', amount: 50, date: format(today, 'yyyy-MM-dd'), status: 'paid' },
  { id: 'pay-7', memberId: 'mem-2', amount: 50, date: format(today, 'yyyy-MM-dd'), status: 'paid' },
];
