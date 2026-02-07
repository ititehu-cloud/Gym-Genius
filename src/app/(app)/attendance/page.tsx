'use client';

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { LoaderCircle, UserCheck, LogOut, CalendarIcon } from "lucide-react";
import type { Member, Attendance } from "@/lib/types";
import { useMemo, useState } from "react";
import { startOfDay, endOfDay, format, parseISO, isSameDay } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export default function AttendancePage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [searchQuery, setSearchQuery] = useState<string>("");

    const membersRef = useMemoFirebase(() => collection(firestore, "members"), [firestore]);
    const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersRef);

    const filteredMembers = useMemo(() => {
        if (!members) return [];
        return members.filter(member =>
            member.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [members, searchQuery]);

    const selectedDateRange = useMemo(() => {
        const start = startOfDay(selectedDate);
        const end = endOfDay(selectedDate);
        return {
            start: start.toISOString(),
            end: end.toISOString()
        };
    }, [selectedDate]);

    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, "attendance"),
            where("checkInTime", ">=", selectedDateRange.start),
            where("checkInTime", "<=", selectedDateRange.end)
        );
    }, [firestore, selectedDateRange]);

    const { data: selectedDateAttendance, isLoading: isLoadingAttendance } = useCollection<Attendance>(attendanceQuery);

    const attendanceMap = useMemo(() => {
        if (!selectedDateAttendance) return new Map<string, Attendance>();
        return new Map(selectedDateAttendance.map(att => [att.memberId, att]));
    }, [selectedDateAttendance]);

    const isLoading = isLoadingMembers || isLoadingAttendance;
    const isToday = isSameDay(selectedDate, new Date());

    const handleCheckIn = async (member: Member) => {
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
    
    const handleCheckOut = async (attendanceId: string, memberId: string, memberName: string) => {
        setLoadingMemberId(memberId);
        const attendanceDocRef = doc(firestore, "attendance", attendanceId);
        try {
            await updateDoc(attendanceDocRef, {
                checkOutTime: new Date().toISOString()
            });
            toast({
                title: "Checked Out!",
                description: `${memberName} has been checked out for today.`
            });
        } catch (error) {
            console.error("Error checking out member:", error);
            toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: "There was a problem checking the member out.",
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
            <div className="flex items-center justify-between gap-4">
                 <h1 className="text-2xl font-headline font-semibold">Attendance</h1>
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Search member..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64"
                    />
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[240px] justify-start text-left font-normal",
                                    !selectedDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && setSelectedDate(date)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Member Check-in</CardTitle>
                    <CardDescription>
                        {isToday ? 'Mark members as present for today. ' : `Viewing attendance for ${format(selectedDate, 'MMMM do, yyyy')}. `}
                        {`${selectedDateAttendance?.length || 0} out of ${members?.length || 0} members checked in.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {members && members.length > 0 ? (
                        filteredMembers.length > 0 ? (
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Member</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead>Timestamps</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredMembers.map((member) => {
                                            const attendanceRecord = attendanceMap.get(member.id);
                                            const isCheckedOut = !!attendanceRecord?.checkOutTime;
                                            
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
                                                        {attendanceRecord ? (
                                                            isCheckedOut ? (
                                                                <Badge variant="outline">Completed</Badge>
                                                            ) : (
                                                                <Badge variant="default" className="bg-chart-2 text-primary-foreground hover:bg-chart-2/90">Checked In</Badge>
                                                            )
                                                        ) : (
                                                            <Badge variant="secondary">Not Here</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm text-muted-foreground space-y-1">
                                                            {attendanceRecord?.checkInTime && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-foreground">In:</span>
                                                                    <span>{format(parseISO(attendanceRecord.checkInTime), 'p')}</span>
                                                                </div>
                                                            )}
                                                            {attendanceRecord?.checkOutTime && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-foreground">Out:</span>
                                                                    <span>{format(parseISO(attendanceRecord.checkOutTime), 'p')}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {!attendanceRecord && isToday ? (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleCheckIn(member)}
                                                                disabled={loadingMemberId === member.id}
                                                            >
                                                                {loadingMemberId === member.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                                                                Check In
                                                            </Button>
                                                        ) : attendanceRecord && !isCheckedOut && isToday ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleCheckOut(attendanceRecord.id, member.id, member.name)}
                                                                disabled={loadingMemberId === member.id}
                                                            >
                                                                {loadingMemberId === member.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                                                                Check Out
                                                            </Button>
                                                        ) : (
                                                          <span className="text-sm text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center text-center py-12">
                                <h3 className="text-xl font-bold tracking-tight">No Members Found</h3>
                                <p className="text-sm text-muted-foreground">Your search for "{searchQuery}" did not return any results.</p>
                            </div>
                        )
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
