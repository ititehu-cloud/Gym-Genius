'use client';

import { format, isSameDay, isThisMonth, parseISO, startOfDay } from "date-fns";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Member, Payment, Attendance, Plan } from "@/lib/types";
import StatsCard from "@/components/dashboard/stats-card";

export default function DashboardPage() {
  const firestore = useFirestore();

  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(
      useMemoFirebase(() => collection(firestore, "members"), [firestore])
  );
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(
      useMemoFirebase(() => collection(firestore, "payments"), [firestore])
  );
  const { data: plans, isLoading: isLoadingPlans } = useCollection<Plan>(
    useMemoFirebase(() => collection(firestore, "plans"), [firestore])
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
    
    const planMap = new Map(plans?.map(p => [p.id, p]));

    const activeMembers = members?.filter(m => {
      const expiryDate = parseISO(m.expiryDate);
      return expiryDate >= startOfToday;
    }).length ?? 0;
    
    const expiredMembers = members?.filter(m => parseISO(m.expiryDate) < startOfToday) ?? [];

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
    
    const totalCollection = paidPayments.reduce((sum, p) => sum + p.amount, 0);

    const totalDues = expiredMembers.reduce((sum, member) => {
        const plan = planMap.get(member.planId);
        return sum + (plan?.price || 0);
    }, 0);
    
    const monthlyDues = members?.reduce((sum, member) => {
        const plan = planMap.get(member.planId);
        if (!plan) return sum;

        const monthlyInstallment = plan.duration > 0 ? plan.price / plan.duration : plan.price;

        const paymentsThisMonth = paidPayments.filter(p => 
            p.memberId === member.id && isThisMonth(parseISO(p.paymentDate))
        );
        
        const totalPaidThisMonth = paymentsThisMonth.reduce((acc, p) => acc + p.amount, 0);
        const dueForMonth = Math.max(0, monthlyInstallment - totalPaidThisMonth);
        
        return sum + dueForMonth;
    }, 0) ?? 0;

    return {
        activeMembers,
        expiryToday,
        presentToday,
        absentToday,
        todaysCollection,
        monthlyCollection,
        monthlyDues,
        totalCollection,
        totalDues
    };
  }, [members, payments, plans, todaysAttendance]);

  const isLoading = isLoadingMembers || isLoadingPayments || isLoadingAttendance || isLoadingPlans;

  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-muted/30">
        <div className="space-y-8 mt-4">
            <div>
                <Skeleton className="h-7 w-32 mb-4" />
                <div className="grid gap-6 grid-cols-2">
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                </div>
            </div>
            <div>
                <Skeleton className="h-7 w-32 mb-4" />
                <div className="grid gap-6 grid-cols-2">
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                </div>
            </div>
            <div>
                <Skeleton className="h-7 w-32 mb-4" />
                <div className="grid gap-6 grid-cols-2">
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                </div>
            </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-muted/30">
        <div className="space-y-8">
            <div>
                <div className="flex items-baseline gap-2 mb-4">
                    <h2 className="text-xl font-semibold">Today's Stats</h2>
                    <p className="text-xl text-muted-foreground">{format(new Date(), "d MMM yyyy")}</p>
                </div>
                <div className="grid gap-4 grid-cols-2">
                    <StatsCard title="Active Members" value={stats.activeMembers} href="/members?status=active" className="bg-chart-2/10" valueClassName="text-chart-2" />
                    <StatsCard title="Expiring Today" value={stats.expiryToday} href="/members?expiry=today" className="bg-chart-5/10" valueClassName="text-chart-5" />
                    <StatsCard title="Present Today" value={stats.presentToday} href="/attendance?filter=present" className="bg-chart-2/10" valueClassName="text-chart-2" />
                    <StatsCard title="Absent Today" value={stats.absentToday} href="/attendance" className="bg-destructive/10" valueClassName="text-destructive" />
                    <StatsCard title="Collected Today" value={`₹${stats.todaysCollection.toLocaleString()}`} href="/payments?date=today&status=paid" className="bg-primary/10" valueClassName="text-primary" />
                </div>
            </div>

            <div>
                <div className="flex items-baseline gap-2 mb-4">
                    <h2 className="text-xl font-semibold">Monthly Stats</h2>
                    <p className="text-xl text-muted-foreground">{format(new Date(), "MMMM yyyy")}</p>
                </div>
                <div className="grid gap-4 grid-cols-2">
                    <StatsCard title="Month Collection" value={`₹${stats.monthlyCollection.toLocaleString()}`} href="/payments?status=paid" className="bg-primary/10" valueClassName="text-primary" />
                    <StatsCard title="Month Due" value={`₹${stats.monthlyDues.toLocaleString()}`} href="/payments?filter=due_this_month" className="bg-chart-5/10" valueClassName="text-chart-5" />
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">Financial Summary</h2>
                <div className="grid gap-4 grid-cols-2">
                    <StatsCard title="Total Due" value={`₹${stats.totalDues.toLocaleString()}`} href="/members?status=expired" className="bg-destructive/10" valueClassName="text-destructive" />
                    <StatsCard title="Total Collection" value={`₹${stats.totalCollection.toLocaleString()}`} href="/transactions" className="bg-chart-2/10" valueClassName="text-chart-2" />
                </div>
            </div>
        </div>
    </main>
  );
}
