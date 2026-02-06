'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoaderCircle, Tags } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Plan } from "@/lib/types";
import AddPlanDialog from "@/components/plans/add-plan-dialog";

export default function PlansPage() {
  const firestore = useFirestore();
  const plansRef = useMemoFirebase(() => collection(firestore, "plans"), [firestore]);
  const { data: plans, isLoading } = useCollection<Plan>(plansRef);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-headline font-semibold">Membership Plans</h1>
        <AddPlanDialog />
      </div>

      {plans && plans.length > 0 ? (
        <div className="grid gap-4 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {plans.map(plan => (
              <Card key={plan.id} className="flex flex-col">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                          <Tags className="h-5 w-5 text-primary"/>
                          {plan.name}
                      </CardTitle>
                      <CardDescription>{plan.duration} Month Access</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                      {plan.description && <p className="text-muted-foreground mb-4">{plan.description}</p>}
                      <p className="text-4xl font-bold">₹{plan.price}</p>
                  </CardContent>
                  <CardFooter>
                      <Button variant="outline" className="w-full">Edit Plan</Button>
                  </CardFooter>
              </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm py-12">
          <div className="text-center">
              <h3 className="text-2xl font-bold tracking-tight">No plans found</h3>
              <p className="text-sm text-muted-foreground mb-4">Get started by creating a new membership plan.</p>
              <AddPlanDialog />
          </div>
        </div>
      )}
    </main>
  );
}
