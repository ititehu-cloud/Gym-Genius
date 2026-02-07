'use client';

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { LoaderCircle, UserCheck } from "lucide-react";
import type { Member, Attendance } from "@/lib/types";
import { useMemo, useState } from "react";
import { startOfDay, endOfDay, format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function AttendancePage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);

    const membersRef = useMemoFirebase(() => collection(firestore, "members"), [firestore]);
    const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersRef);

    const todayRange = useMemo(() => {
        const now = new Date();
        return {
            start: startOfDay(now).toISOString(),
            end: endOfDay(now).toISOString()
        };
    }, []);

    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, "attendance"),
            where("checkInTime", ">=", todayRange.start),
            where("checkInTime", "<=", todayRange.end)
        );
    }, [firestore, todayRange]);

    const { data: todaysAttendance, isLoading: isLoadingAttendance } = useCollection<Attendance>(attendanceQuery);

    const checkedInMemberIds = useMemo(() => {
        if (!todaysAttendance) return new Set();
        return new Set(todaysAttendance.map(att => att.memberId));
    }, [todaysAttendance]);

    const isLoading = isLoadingMembers || isLoadingAttendance;

    const handleCheckIn = async (member: Member) => {
        if (checkedInMemberIds.has(member.id)) return;
        setLoadingMemberId(member.id);
        const attendanceCollection = collection(firestore, "attendance");
        try {
            await addDoc(attendanceCollection, {
                memberId: member.id,
                checkInTime: new Date().toISOString(),
                createdAt: serverTimestamp()
            });
            toast({
                title: "Checked In!",
                description: `${member.name} has been checked in for today.`
            });
        } catch (error) {
            console.error("Error checking in member:", error);
            toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: "There was a problem checking the member in.",
            });
        } finally {
            setLoadingMemberId(null);
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center">
                <h1 className="text-2xl font-headline font-semibold">Today's Attendance</h1>
                <Badge variant="outline" className="ml-4">{format(new Date(), 'MMMM do, yyyy')}</Badge>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Member Check-in</CardTitle>
                    <CardDescription>
                        {`Mark members as present for today. ${checkedInMemberIds.size} out of ${members?.length || 0} members checked in.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {members && members.length > 0 ? (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Member</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {members.map((member) => {
                                        const isCheckedIn = checkedInMemberIds.has(member.id);
                                        return (
                                            <TableRow key={member.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-4">
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarImage src={member.imageUrl} alt={member.name} />
                                                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium">{member.name}</div>
                                                            <div className="text-sm text-muted-foreground">ID: {member.memberId}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {isCheckedIn ? (
                                                        <Badge variant="default" className="bg-chart-2 text-primary-foreground hover:bg-chart-2/90">Checked In</Badge>
                                                    ) : (
                                                        <Badge variant="secondary">Not Here</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleCheckIn(member)}
                                                        disabled={isCheckedIn || loadingMemberId === member.id}
                                                    >
                                                        {loadingMemberId === member.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                                                        Check In
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm py-12">
                            <div className="text-center">
                                <h3 className="text-2xl font-bold tracking-tight">No members found</h3>
                                <p className="text-sm text-muted-foreground">Add members in the 'Members' section to see them here.</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
