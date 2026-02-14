'use client';

import { format, isSameDay, isThisMonth, parseISO, startOfDay } from "date-fns";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Member, Payment, Attendance } from "@/lib/types";
import StatsCard from "@/components/dashboard/stats-card";
import { Users, UserCheck, CalendarDays, IndianRupee, FileText, TrendingDown, TrendingUp } from "lucide-react";

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
    
    const expiryToday = members?.filter(m => isSameDay(parseISO(m.expiryDate), today)).length ?? 0;
    
    const presentToday = todaysAttendance?.length ?? 0;

    const paidPayments = payments?.filter(p => p.status === 'paid') ?? [];
    const pendingPayments = payments?.filter(p => p.status === 'pending') ?? [];

    const todaysCollection = paidPayments
        .filter(p => isSameDay(parseISO(p.paymentDate), today))
        .reduce((sum, p) => sum + p.amount, 0);
    
    const monthlyCollection = paidPayments
        .filter(p => isThisMonth(parseISO(p.paymentDate)))
        .reduce((sum, p) => sum + p.amount, 0);

    const monthlyDues = pendingPayments.filter(p => 
        isThisMonth(parseISO(p.paymentDate))
    ).length ?? 0;

    const totalCollection = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalDues = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
        activeMembers,
        expiryToday,
        presentToday,
        todaysCollection,
        monthlyCollection,
        monthlyDues,
        totalCollection,
        totalDues
    };
  }, [members, payments, todaysAttendance]);

  const isLoading = isLoadingMembers || isLoadingPayments || isLoadingAttendance;

  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="space-y-4">
            <Skeleton className="h-8 w-64 mb-4" />
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-[108px] w-full rounded-2xl" />
                <Skeleton className="h-[108px] w-full rounded-2xl" />
                <Skeleton className="h-[108px] w-full rounded-2xl" />
                <Skeleton className="h-[108px] w-full rounded-2xl" />
                <Skeleton className="h-[108px] w-full rounded-2xl" />
                <Skeleton className="h-[108px] w-full rounded-2xl" />
                <Skeleton className="h-[108px] w-full rounded-2xl" />
                <Skeleton className="h-[108px] w-full rounded-2xl" />
            </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Dashboard Overview</h1>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard title="Active Members" value={stats.activeMembers} icon={Users} className="bg-primary/10" href="/members?status=active" />
                <StatsCard title="Present Today" value={stats.presentToday} icon={UserCheck} className="bg-primary/10" href="/attendance?filter=present" />
                <StatsCard title="Expiry Today" value={stats.expiryToday} icon={CalendarDays} className="bg-muted" href="/members?expiry=today" />
                <StatsCard title="Today's Collection" value={`₹${stats.todaysCollection.toLocaleString()}`} icon={IndianRupee} className="bg-chart-2/10" href="/payments?date=today&status=paid" />
                <StatsCard title="Monthly Collection" value={`₹${stats.monthlyCollection.toLocaleString()}`} icon={FileText} className="bg-chart-4/10" href="/payments?status=paid" />
                <StatsCard title="Monthly Dues" value={stats.monthlyDues} icon={TrendingDown} className="bg-destructive/10" href="/payments?status=pending" />
                <StatsCard title="Total Collection" value={`₹${stats.totalCollection.toLocaleString()}`} icon={TrendingUp} className="bg-chart-5/10" href="/payments?status=paid" />
                <StatsCard title="Total Dues" value={`₹${stats.totalDues.toLocaleString()}`} icon={TrendingDown} className="bg-destructive/10" href="/payments?status=pending" />
            </div>
        </div>
    </main>
  );
}
