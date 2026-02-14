'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { addMonths, format } from "date-fns";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { Plan } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Textarea } from "../ui/textarea";
import Image from "next/image";
import { uploadImage } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { compressImage } from "@/lib/utils";

const formSchema = z.object({
  memberId: z.string().min(1, { message: "Member ID cannot be empty." }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  mobileNumber: z.string().min(10, { message: "Please enter a valid mobile number." }),
  address: z.string().min(5, { message: "Address is too short." }),
  planId: z.string({ required_error: "Please select a membership plan." }),
  joinDate: z.string({ required_error: "Please select a joining date." }),
  profilePicture: z.any().optional(),
});

type AddMemberFormProps = {
  setDialogOpen: (open: boolean) => void;
};

export default function AddMemberForm({ setDialogOpen }: AddMemberFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const plansRef = useMemoFirebase(() => collection(firestore, "plans"), [firestore]);
  const { data: plans, isLoading: isLoadingPlans } = useCollection<Plan>(plansRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: "",
      name: "",
      mobileNumber: "",
      address: "",
      joinDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setFormError(null);
    
    let imageUrl: string | undefined = undefined;

    const imageFile = values.profilePicture?.[0];

    if (imageFile) {
        try {
            // Compress the image before uploading
            const compressedBlob = await compressImage(imageFile, { maxWidth: 800, quality: 0.8 });
            
            const formData = new FormData();
            formData.append('image', compressedBlob, imageFile.name.replace(/\.[^/.]+$/, ".jpg"));
            const uploadResult = await uploadImage(formData);

            if (uploadResult.error) {
                setFormError(uploadResult.error);
                setIsSubmitting(false);
                return;
            }
            if (uploadResult.url) {
                imageUrl = uploadResult.url;
            }
        } catch (compressionError: any) {
            console.error("Image compression error:", compressionError);
            setFormError(compressionError.message || "Failed to process image. Please try a different one.");
            setIsSubmitting(false);
            return;
        }
    }

    if (!imageUrl) {
      imageUrl = `https://picsum.photos/seed/${Math.random()}/400/400`;
    }

    if (!plans) {
        setFormError('Plans not loaded. Cannot calculate expiry date.');
        setIsSubmitting(false);
        return;
    }

    const selectedPlan = plans.find(p => p.id === values.planId);
    if (!selectedPlan) {
        setFormError('Selected plan not found.');
        setIsSubmitting(false);
        return;
    }
    
    const expiryDate = addMonths(new Date(values.joinDate), selectedPlan.duration);
    
    const { profilePicture, ...dataToSave } = values;

    try {
      const membersCollection = collection(firestore, "members");
      await addDoc(membersCollection, {
        ...dataToSave,
        joinDate: new Date(values.joinDate).toISOString(),
        expiryDate: expiryDate.toISOString(),
        status: 'active',
        imageUrl: imageUrl,
        createdAt: serverTimestamp()
      });

      toast({
        title: "Member Added!",
        description: `${values.name} has been successfully added.`,
      });
      form.reset();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error adding member:", error);
      const errorMessage = error instanceof Error ? error.message : "There was a problem adding the member. Please try again.";
      setFormError(errorMessage);
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {formError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="memberId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Member ID</FormLabel>
              <FormControl>
                <Input placeholder="e.g., GYM-001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="mobileNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile Number</FormLabel>
              <FormControl>
                <Input placeholder="9876543210" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="joinDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Joining Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="123, Main Street, Anytown..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="planId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Membership Plan</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingPlans}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingPlans ? "Loading plans..." : "Select a plan"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {plans?.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="profilePicture"
          render={({ field: { onChange, value, ...rest } }) => (
            <FormItem>
              <FormLabel>Profile Picture</FormLabel>
              <FormControl>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      form.setValue('profilePicture', e.target.files)
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {imagePreview && (
          <div className="flex items-center justify-center gap-4">
              <Image src={imagePreview} alt="Profile preview" width={100} height={100} className="rounded-full object-cover aspect-square" />
               <Button type="button" variant="outline" size="sm" onClick={() => {
                  form.setValue('profilePicture', null);
                  setImagePreview(null);
               }}>Remove</Button>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Add Member
            </Button>
        </div>
      </form>
    </Form>
  );
}
