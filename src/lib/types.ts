
export type Member = {
  id: string;
  userId: string;
  memberId: string;
  name: string;
  mobileNumber?: string;
  address: string;
  imageUrl: string;
  idCardUrl?: string;
  planId: string;
  joinDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'due';
  createdAt?: any;
};

export type Plan = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  createdAt?: any;
};

export type Payment = {
  id: string;
  userId: string;
  memberId: string;
  amount: number;
  paymentDate: string;
  status: 'paid' | 'pending';
  paymentMethod: string;
  paymentType: 'monthly' | 'renewal' | 'advance';
  invoiceNumber?: string;
  createdAt?: any;
};

export type Attendance = {
  id: string;
  userId: string;
  memberId: string;
  checkInTime: string;
  checkOutTime?: string;
  createdAt?: any;
};

export type MemberNote = {
  id: string;
  userId: string;
  memberId: string;
  content: string;
  noteDate: string;
  createdAt: any;
};

export type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  displayAddress?: string;
  icon?: string;
  validity?: string;
};
