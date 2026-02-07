export type Member = {
  id: string;
  memberId: string;
  name: string;
  mobileNumber: string;
  address: string;
  imageUrl: string;
  planId: string;
  joinDate: string; // Should be ISO string
  expiryDate: string; // Should be ISO string
  status: 'active' | 'expired' | 'due';
};

export type Plan = {
  id: string;
  name: string;
  description?: string;
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
  checkInTime: string; // ISO string
  checkOutTime?: string; // ISO string
};
