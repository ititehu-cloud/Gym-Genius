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
import { AlertTriangle, LoaderCircle, Camera } from "lucide-react";
import { addMonths, format, parseISO } from "date-fns";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import type { Plan, Member, UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import Image from "next/image";
import { uploadImage } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { compressImage } from "@/lib/utils";
import html2canvas from "html2canvas";

const formSchema = z.object({
  memberId: z.string().min(1, { message: "Member ID cannot be empty." }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  mobileNumber: z.string().optional(),
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
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  const cardCaptureRef = useRef<HTMLDivElement>(null);

  const plansRef = useMemoFirebase(() => collection(firestore, "plans"), [firestore]);
  const { data: plans } = useCollection<Plan>(plansRef);

  const membersRef = useMemoFirebase(() => collection(firestore, "members"), [firestore]);
  const { data: members } = useCollection<Member>(membersRef);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

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

  async function generateAndUploadIdCard(memberData: any, planName: string, imageUrl: string): Promise<string | null> {
    if (!cardCaptureRef.current) return null;
    
    try {
      // Delay slightly for React to render the hidden capture area with real data
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const canvas = await html2canvas(cardCaptureRef.current, {
        useCORS: true,
        scale: 1.5,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.9));
      if (!blob) return null;

      const file = new File([blob], `${memberData.name}_ID.png`, { type: 'image/png' });
      const formData = new FormData();
      formData.append('image', file);
      
      const uploadResult = await uploadImage(formData);
      return uploadResult.url || null;
    } catch (err) {
      console.error("ID Card Pre-generation failed:", err);
      return null;
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setFormError(null);
    
    const isIdDuplicate = members?.some(m => m.memberId.toLowerCase() === values.memberId.toLowerCase());
    if (isIdDuplicate) {
      setFormError(`A member with ID "${values.memberId}" already exists.`);
      setIsSubmitting(false);
      return;
    }

    let imageUrl: string | undefined = undefined;
    const imageFile = values.profilePicture?.[0];

    if (imageFile) {
        try {
            const compressedBlob = await compressImage(imageFile, { maxWidth: 800, quality: 0.8 });
            const formData = new FormData();
            formData.append('image', compressedBlob, imageFile.name.replace(/\.[^/.]+$/, ".jpg"));
            const uploadResult = await uploadImage(formData);
            if (uploadResult.url) imageUrl = uploadResult.url;
        } catch (err) {
            console.error("Image upload error:", err);
        }
    }

    if (!imageUrl) {
      imageUrl = `https://picsum.photos/seed/${values.memberId}/400/400`;
    }

    const selectedPlan = plans?.find(p => p.id === values.planId);
    if (!selectedPlan) {
        setFormError('Plan not found.');
        setIsSubmitting(false);
        return;
    }
    
    const expiryDate = addMonths(new Date(values.joinDate), selectedPlan.duration);
    
    try {
      const membersCollection = collection(firestore, "members");
      const newMemberDoc = await addDoc(membersCollection, {
        memberId: values.memberId,
        name: values.name,
        address: values.address,
        planId: values.planId,
        mobileNumber: values.mobileNumber || "",
        joinDate: new Date(values.joinDate).toISOString(),
        expiryDate: expiryDate.toISOString(),
        status: 'active',
        imageUrl: imageUrl,
        createdAt: serverTimestamp()
      });

      toast({ title: "Member Created", description: "Finalizing digital ID card..." });
      
      // Use the final imageUrl for generation
      const idCardUrl = await generateAndUploadIdCard({
        ...values,
        imageUrl,
        expiryDate: expiryDate.toISOString()
      }, selectedPlan.name, imageUrl);

      if (idCardUrl) {
        await updateDoc(doc(firestore, "members", newMemberDoc.id), { idCardUrl });
      }

      toast({ title: "Success!", description: `${values.name} added successfully.` });
      form.reset();
      setDialogOpen(false);
    } catch (error) {
      console.error("Add member error:", error);
      setFormError("Failed to add member.");
    } finally {
        setIsSubmitting(false);
    }
  }

  const selectedPlanId = form.watch('planId');
  const selectedPlan = plans?.find(p => p.id === selectedPlanId);
  const captureImageUrl = imagePreview || `https://picsum.photos/seed/${form.watch('memberId') || 'temp'}/400/400`;

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

        <div className="flex items-center gap-4">
            <div className="flex-grow">
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
            </div>
             <div className="flex flex-col items-center gap-1">
                <FormField
                    control={form.control}
                    name="profilePicture"
                    render={() => (
                        <FormItem>
                            <FormControl>
                                <label htmlFor="picture-upload-add" className="cursor-pointer">
                                    <div className="relative h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground overflow-hidden hover:bg-muted/80">
                                    {imagePreview ? (
                                        <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                                    ) : (
                                        <Camera className="h-8 w-8" />
                                    )}
                                    </div>
                                    <Input
                                    id="picture-upload-add"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                        form.setValue('profilePicture', e.target.files);
                                        const reader = new FileReader();
                                        reader.onloadend = () => setImagePreview(reader.result as string);
                                        reader.readAsDataURL(file);
                                        }
                                    }}
                                    />
                                </label>
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="memberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Member ID</FormLabel>
                <FormControl>
                  <Input placeholder="GYM-001" {...field} />
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
                <FormLabel>Mobile</FormLabel>
                <FormControl>
                  <Input placeholder="9876543210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="joinDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Join Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
                <FormLabel>Plan</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {plans?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Main St..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Add Member
            </Button>
        </div>

        {/* Hidden capture area - MATCHING GYM PROFILE */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={cardCaptureRef} className="p-0 bg-[#f8f9fa] w-[600px] text-[#2d3436] font-sans rounded-[24px] overflow-hidden border border-gray-200">
            {/* Header Section */}
            <div className="bg-[#467c6d] p-8 pb-10 rounded-b-[24px] flex justify-between items-start">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold text-white tracking-tight leading-none uppercase">{userProfile?.displayName || 'Gym Name'}</h2>
                    {userProfile?.phoneNumber && <p className="text-xl text-white/80 font-medium">Contact: {userProfile.phoneNumber}</p>}
                </div>
                {userProfile?.icon && (
                  <div className="h-16 w-16 rounded-full bg-white/20 p-2 flex items-center justify-center">
                      <img src={userProfile.icon} alt="Logo" className="h-full w-full object-contain" />
                  </div>
                )}
            </div>

            {/* Profile Section */}
            <div className="px-8 pt-8 flex items-center gap-6">
                <div className="relative h-24 w-24 rounded-full border-[3px] border-[#467c6d] overflow-hidden flex-shrink-0">
                    <img src={captureImageUrl} alt="Preview" className="h-full w-full object-cover" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-3xl font-bold text-[#2d3436] tracking-tight">{form.watch('name') || 'NAME'}</h3>
                    <p className="text-xl text-gray-500 font-medium">ID: {form.watch('memberId') || 'ID'}</p>
                </div>
            </div>

            {/* Separator */}
            <div className="px-8 mt-8">
                <div className="h-[1px] bg-gray-200 w-full" />
            </div>

            {/* Info Section */}
            <div className="p-8 space-y-8">
                <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-400 tracking-widest uppercase">PLAN</span>
                    <span className="text-2xl font-bold text-[#2d3436]">{selectedPlan?.name || 'N/A'}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-12">
                    <div className="space-y-2">
                        <span className="text-xl font-bold text-gray-400 tracking-widest uppercase">START</span>
                        <p className="text-2xl font-bold text-[#2d3436]">{form.watch('joinDate') ? format(parseISO(form.watch('joinDate')), 'dd MMM yyyy') : 'N/A'}</p>
                    </div>
                    <div className="space-y-2">
                        <span className="text-xl font-bold text-gray-400 tracking-widest uppercase">EXPIRY</span>
                        <p className="text-2xl font-bold text-[#2d3436]">{form.watch('joinDate') && selectedPlan ? format(addMonths(parseISO(form.watch('joinDate')), selectedPlan.duration), 'dd MMM yyyy') : 'N/A'}</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
