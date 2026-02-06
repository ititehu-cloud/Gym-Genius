import type { ImagePlaceholder } from './placeholder-images';

export type Member = {
  id: string;
  name: string;
  email: string;
  avatar: ImagePlaceholder;
  planId: string;
  joinDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'due';
};

export type Plan = {
  id: string;
  name: string;
  duration: number; // in months
  price: number;
};

export type Payment = {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending';
};

export type Attendance = {
  id: string;
  memberId: string;
  date: string;
  status: 'present' | 'absent';
};
