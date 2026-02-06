import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Tags } from "lucide-react";
import { plans } from "@/lib/data";

export default function PlansPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-headline font-semibold">Membership Plans</h1>
        <Button>
          <PlusCircle />
          Add Plan
        </Button>
      </div>
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
                    <p className="text-4xl font-bold">${plan.price}</p>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" className="w-full">Edit Plan</Button>
                </CardFooter>
            </Card>
        ))}
      </div>
    </main>
  );
}
