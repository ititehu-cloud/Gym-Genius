'use client';

import { format, isSameDay, isThisMonth, parseISO, startOfDay } from "date-fns";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Member, Payment, Attendance } from "@/lib/types";
import StatsCard from "@/components/dashboard/stats-card";

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
    
    const absentToday = Math.max(0, activeMembers - presentToday);

    const paidPayments = payments?.filter(p => p.status === 'paid') ?? [];

    const todaysCollection = paidPayments
        .filter(p => isSameDay(parseISO(p.paymentDate), today))
        .reduce((sum, p) => sum + p.amount, 0);
    
    const monthlyCollection = paidPayments
        .filter(p => isThisMonth(parseISO(p.paymentDate)))
        .reduce((sum, p) => sum + p.amount, 0);

    const monthlyDues = payments?.filter(p => 
        p.status === 'pending' && isThisMonth(parseISO(p.paymentDate))
    ).reduce((sum, p) => sum + p.amount, 0) ?? 0;

    return {
        todayString: format(today, "d MMM yyyy"),
        activeMembers,
        expiryToday,
        presentToday,
        absentToday,
        todaysCollection,
        monthlyCollection,
        monthlyDues,
    };
  }, [members, payments, todaysAttendance]);

  const isLoading = isLoadingMembers || isLoadingPayments || isLoadingAttendance;

  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="text-center text-muted-foreground mb-4">
            <Skeleton className="h-4 w-32 mx-auto" />
        </div>
        <div className="space-y-8">
            <div>
                <Skeleton className="h-8 w-40 mb-4" />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </div>
            </div>
             <div>
                <Skeleton className="h-8 w-40 mb-4" />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </div>
            </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="text-center text-muted-foreground">Today - {stats.todayString}</div>
        
        <div className="space-y-8 mt-4">
            <div>
                <h2 className="text-xl font-bold mb-4">Today's Stats</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <StatsCard title="Active Members" value={stats.activeMembers} className="bg-chart-2/10 text-chart-2" />
                    <StatsCard title="Expiring Today" value={stats.expiryToday} className="bg-chart-4/10 text-chart-4" />
                    <StatsCard title="Present Today" value={stats.presentToday} className="bg-chart-2/10 text-chart-2" />
                    <StatsCard title="Absent Today" value={stats.absentToday} className="bg-destructive/10 text-destructive" />
                    <StatsCard title="Collected Today" value={`₹${stats.todaysCollection.toLocaleString()}`} className="bg-chart-3/10 text-chart-3" />
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold mb-4">Monthly Stats</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <StatsCard title="Month Collection" value={`₹${stats.monthlyCollection.toLocaleString()}`} className="bg-chart-3/10 text-chart-3" />
                    <StatsCard title="Month Due" value={`₹${stats.monthlyDues.toLocaleString()}`} className="bg-chart-5/10 text-chart-5" />
                </div>
            </div>
        </div>
    </main>
  );
}
