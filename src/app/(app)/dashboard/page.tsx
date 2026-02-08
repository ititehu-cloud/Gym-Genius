'use client';

import { DollarSign, UserCheck, Users, CalendarX, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import StatsCard from "@/components/dashboard/stats-card";
import { format, isSameDay, isThisMonth, parseISO, startOfDay } from "date-fns";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Member, Payment, Attendance } from "@/lib/types";
import Link from "next/link";

export default function DashboardPage() {
  const firestore = useFirestore();

  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(
      useMemoFirebase(() => collection(firestore, "members"), [firestore])
  );
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(
      useMemoFirebase(() => collection(firestore, "payments"), [firestore])
  );

  const todayStart = useMemo(() => startOfDay(new Date()).toISOString(), []);

  const attendanceQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(
          collection(firestore, 'attendance'),
          where('checkInTime', '>=', todayStart)
      )
  }, [firestore, todayStart]);

  const { data: todaysAttendance, isLoading: isLoadingAttendance } = useCollection<Attendance>(attendanceQuery);

  const stats = useMemo(() => {
      const today = new Date();
      const startOfToday = startOfDay(today);
      
      const activeMembers = members?.filter(m => {
        const expiryDate = parseISO(m.expiryDate);
        return expiryDate >= startOfToday;
      }).length ?? 0;
      
      const paidPayments = payments?.filter(p => p.status === 'paid') ?? [];

      const todaysPayments = paidPayments.filter(p => isSameDay(parseISO(p.paymentDate), today));
      const todaysCollection = todaysPayments.reduce((sum, p) => sum + p.amount, 0);
      
      const expiryToday = members?.filter(m => isSameDay(parseISO(m.expiryDate), today)).length ?? 0;
      
      const presentToday = todaysAttendance?.filter(att => isSameDay(parseISO(att.checkInTime), today)).length ?? 0;
      
      const monthlyCollection = paidPayments
          .filter(p => isThisMonth(parseISO(p.paymentDate)))
          .reduce((sum, p) => sum + p.amount, 0);

      const pendingDuesMembers = members?.filter(m => m.status === 'due').length ?? 0;
      
      const totalCollection = paidPayments.reduce((sum, p) => sum + p.amount, 0);
      
      const totalDues = payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) ?? 0;

      return {
          todayString: format(today, "MMMM do, yyyy"),
          monthString: format(today, "MMMM"),
          activeMembers,
          todaysCollection,
          expiryToday,
          presentToday,
          monthlyCollection,
          pendingDues: pendingDuesMembers,
          totalCollection,
          totalDues,
      };
  }, [members, payments, todaysAttendance]);

  const isLoading = isLoadingMembers || isLoadingPayments || isLoadingAttendance;

  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Skeleton className="h-10 w-1/2 col-span-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Skeleton className="h-10 w-1/2 col-span-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Skeleton className="h-10 w-1/2 col-span-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <h1 className="text-2xl font-headline font-semibold col-span-full">Today's Statistics ({stats.todayString})</h1>
        <Link href="/members?status=active"><StatsCard title="Active Members" value={stats.activeMembers} icon={Users} color="text-primary" className="bg-primary/10" /></Link>
        <Link href="/attendance"><StatsCard title="Present Today" value={stats.presentToday} icon={UserCheck} color="text-accent" className="bg-accent/10" /></Link>
        <Link href="/members?expiry=today"><StatsCard title="Expiry Today" value={stats.expiryToday} icon={CalendarX} color="text-chart-3" className="bg-chart-3/10" /></Link>
        <Link href="/payments?date=today"><StatsCard title="Today's Collection" value={`₹${stats.todaysCollection.toLocaleString()}`} icon={DollarSign} color="text-chart-2" className="bg-chart-2/10" /></Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
         <h2 className="text-2xl font-headline font-semibold col-span-full">Monthly Statistics ({stats.monthString})</h2>
        <Link href="/payments"><StatsCard title="Monthly Collection" value={`₹${stats.monthlyCollection.toLocaleString()}`} icon={Wallet} color="text-chart-4" className="bg-chart-4/10" /></Link>
        <Link href="/members?status=due"><StatsCard title="Pending Dues" value={stats.pendingDues} icon={TrendingDown} color="text-chart-1" className="bg-chart-1/10" /></Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
         <h2 className="text-2xl font-headline font-semibold col-span-full">Overall Statistics</h2>
        <Link href="/payments?status=paid"><StatsCard title="Total Collection" value={`₹${stats.totalCollection.toLocaleString()}`} icon={TrendingUp} color="text-chart-5" className="bg-chart-5/10" /></Link>
        <Link href="/payments?status=pending"><StatsCard title="Total Dues" value={`₹${stats.totalDues.toLocaleString()}`} icon={TrendingDown} color="text-destructive" className="bg-destructive/10" /></Link>
      </div>
    </main>
  );
}
