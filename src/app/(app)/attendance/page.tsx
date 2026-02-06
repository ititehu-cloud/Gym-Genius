import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ClipboardCheck } from "lucide-react";

export default function AttendancePage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center">
        <h1 className="text-2xl font-headline font-semibold">Attendance</h1>
      </div>
      <Card className="flex flex-col items-center justify-center min-h-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-muted-foreground">
            <ClipboardCheck className="h-8 w-8" />
            Attendance Module
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>This is where you'll track member attendance.</p>
          <p>A list of members with check-in buttons and attendance history will be available here.</p>
        </CardContent>
      </Card>
    </main>
  );
}
