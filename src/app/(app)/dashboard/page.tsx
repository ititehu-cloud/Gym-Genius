'use client';

import { DollarSign, UserCheck, Users, CalendarX, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import StatsCard from "@/components/dashboard/stats-card";
import AtRiskMembers from "@/components/dashboard/at-risk-members";
import { format } from "date-fns";
import { members, payments } from "@/lib/data";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    todayString: '',
    monthString: '',
    activeMembers: 0,
    todaysCollection: 0,
    expiryToday: 0,
    presentToday: 3, // Mock data
    monthlyCollection: 0,
    pendingDues: 0,
    totalCollection: 0,
    totalDues: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const activeMembers = members.filter(m => m.status === 'active').length;
    const todaysPayments = payments.filter(p => p.date === format(today, 'yyyy-MM-dd'));
    const todaysCollection = todaysPayments.reduce((sum, p) => sum + p.amount, 0);
    const expiryToday = members.filter(m => m.expiryDate === format(today, 'yyyy-MM-dd')).length;
    
    const monthlyCollection = payments.filter(p => new Date(p.date).getMonth() === today.getMonth()).reduce((sum, p) => sum + p.amount, 0);
    const pendingDues = members.filter(m => m.status === 'due').length;

    const totalCollection = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalDues = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

    setStats({
        todayString: format(today, "MMMM do, yyyy"),
        monthString: format(today, "MMMM"),
        activeMembers,
        todaysCollection,
        expiryToday,
        presentToday: 3, // Mock data
        monthlyCollection,
        pendingDues,
        totalCollection,
        totalDues,
    });
    setIsLoading(false);
  }, []);

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
        <StatsCard title="Active Members" value={stats.activeMembers} icon={Users} color="text-primary" className="bg-primary/10" />
        <StatsCard title="Present Today" value={stats.presentToday} icon={UserCheck} color="text-accent" className="bg-accent/10" />
        <StatsCard title="Expiry Today" value={stats.expiryToday} icon={CalendarX} color="text-chart-3" className="bg-chart-3/10" />
        <StatsCard title="Today's Collection" value={`₹${stats.todaysCollection.toLocaleString()}`} icon={DollarSign} color="text-chart-2" className="bg-chart-2/10" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
         <h2 className="text-2xl font-headline font-semibold col-span-full">Monthly Statistics ({stats.monthString})</h2>
        <StatsCard title="Monthly Collection" value={`₹${stats.monthlyCollection.toLocaleString()}`} icon={Wallet} color="text-chart-4" className="bg-chart-4/10" />
        <StatsCard title="Pending Dues" value={stats.pendingDues} icon={TrendingDown} color="text-chart-1" className="bg-chart-1/10" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
         <h2 className="text-2xl font-headline font-semibold col-span-full">Overall Statistics</h2>
        <StatsCard title="Total Collection" value={`₹${stats.totalCollection.toLocaleString()}`} icon={TrendingUp} color="text-chart-5" className="bg-chart-5/10" />
        <StatsCard title="Total Dues" value={`₹${stats.totalDues.toLocaleString()}`} icon={TrendingDown} color="text-destructive" className="bg-destructive/10" />
      </div>
      
      <AtRiskMembers />
    </main>
  );
}
