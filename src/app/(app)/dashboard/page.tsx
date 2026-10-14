
'use client';

import { format, isSameDay, parseISO, startOfDay, addDays, endOfDay, differenceInMonths, isSameMonth } from "date-fns";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Member, Payment, Plan } from "@/lib/types";
import StatsCard from "@/components/dashboard/stats-card";

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const membersRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "members"), where("userId", "==", user.uid));
  }, [firestore, user]);
  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersRef);

  const paymentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "payments"), where("userId", "==", user.uid));
  }, [firestore, user]);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsRef);

  const plansRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "plans"), where("userId", "==", user.uid));
  }, [firestore, user]);
  const { data: plans, isLoading: isLoadingPlans } = useCollection<Plan>(plansRef);

  const stats = useMemo(() => {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const in7Days = endOfDay(addDays(startOfToday, 7));
    const in15Days = endOfDay(addDays(startOfToday, 15));
    
    // Monthly Stats Target (Current Month)
    const targetMonthDate = today;

    const planMap = new Map(plans?.map(p => [p.id, p]));

    // Today's Context Active List
    const activeMembersListToday = members?.filter(m => {
      const expiryDate = parseISO(m.expiryDate);
      return expiryDate >= startOfToday;
    }) ?? [];
    
    const activeMembers = activeMembersListToday.length;
    
    const expiredMembersList = members?.filter(m => parseISO(m.expiryDate) < startOfToday) ?? [];
    const expiredMembers = expiredMembersList.length;

    const expiryToday = members?.filter(m => isSameDay(parseISO(m.expiryDate), today)).length ?? 0;
    
    const expiry7Days = members?.filter(m => {
        const expiryDate = parseISO(m.expiryDate);
        return expiryDate >= startOfToday && expiryDate <= in7Days;
    }).length ?? 0;

    const expiry15Days = members?.filter(m => {
        const expiryDate = parseISO(m.expiryDate);
        return expiryDate >= startOfToday && expiryDate <= in15Days;
    }).length ?? 0;

    const paidPayments = payments?.filter(p => p.status === 'paid') ?? [];

    const todaysCollection = paidPayments
        .filter(p => isSameDay(parseISO(p.paymentDate), today))
        .reduce((sum, p) => sum + p.amount, 0);
    
    // Calculate Monthly Stats for current month
    const monthlyCollection = paidPayments
        .filter(p => isSameMonth(parseISO(p.paymentDate), targetMonthDate))
        .reduce((sum, p) => sum + p.amount, 0);
    
    const totalCollection = paidPayments.reduce((sum, p) => sum + p.amount, 0);

    // Balance-Forward Due calculation logic
    const calculateMemberDue = (member: Member) => {
        const plan = planMap.get(member.planId);
        if (!plan) return 0;
        
        const anchorDate = parseISO(member.joinDate);
        
        // Calculate cycles elapsed (e.g., if plan is 1 month and they joined 35 days ago, they are in cycle 2)
        const totalMonthsElapsed = differenceInMonths(today, anchorDate);
        const cyclesElapsed = Math.max(1, Math.floor(totalMonthsElapsed / plan.duration) + 1);
        
        const totalOwed = cyclesElapsed * plan.price;

        // Sum all paid payments for this member since their joining date
        const memberTotalPaid = paidPayments
            .filter(p => p.memberId === member.id && parseISO(p.paymentDate) >= startOfDay(anchorDate))
            .reduce((acc, p) => acc + p.amount, 0);

        return Math.max(0, totalOwed - memberTotalPaid);
    };

    // Monthly Due: Sum of current period outstanding balances for active members
    const monthlyDues = activeMembersListToday.reduce((sum, member) => {
        return sum + calculateMemberDue(member);
    }, 0);

    // Total Due: Sum of current period outstanding balances for ALL members
    const totalDues = members?.reduce((sum, member) => {
        return sum + calculateMemberDue(member);
    }, 0) ?? 0;

    return {
        activeMembers,
        expiredMembers,
        expiryToday,
        expiry7Days,
        expiry15Days,
        todaysCollection,
        monthlyCollection,
        monthlyDues,
        totalCollection,
        totalDues,
        targetMonthDate
    };
  }, [members, payments, plans]);

  const isLoading = isLoadingMembers || isLoadingPayments || isLoadingPlans;

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
                    <StatsCard title="Expired Members" value={stats.expiredMembers} href="/members?status=expired" className="bg-destructive/10" valueClassName="text-destructive" />
                    <StatsCard title="Expiring Today" value={stats.expiryToday} href="/members?expiry=today" className="bg-chart-5/10" valueClassName="text-chart-5" />
                    <StatsCard title="Expiry (0-7d)" value={stats.expiry7Days} href="/members?expiry=7days" className="bg-amber-500/10" valueClassName="text-amber-600" />
                    <StatsCard title="Expiry (0-15d)" value={stats.expiry15Days} href="/members?expiry=15days" className="bg-orange-500/10" valueClassName="text-orange-600" />
                    <StatsCard title="Collected Today" value={`₹${stats.todaysCollection.toLocaleString()}`} href="/payments?date=today&status=paid" className="bg-primary/10" valueClassName="text-primary" />
                </div>
            </div>

            <div className="bg-white/50 p-4 rounded-2xl border border-muted shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-xl font-semibold">Monthly Stats</h2>
                        <p className="text-xl text-muted-foreground">{format(stats.targetMonthDate, "MMMM yyyy")}</p>
                    </div>
                </div>
                <div className="grid gap-4 grid-cols-2">
                    <StatsCard title="Month Collection" value={`₹${stats.monthlyCollection.toLocaleString()}`} href={`/payments?status=paid&month=${format(stats.targetMonthDate, 'yyyy-MM')}`} className="bg-primary/10" valueClassName="text-primary" />
                    <StatsCard title="Month Due" value={`₹${stats.monthlyDues.toLocaleString()}`} href={`/payments?filter=due_this_month&month=${format(stats.targetMonthDate, 'yyyy-MM')}`} className="bg-chart-5/10" valueClassName="text-chart-5" />
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
