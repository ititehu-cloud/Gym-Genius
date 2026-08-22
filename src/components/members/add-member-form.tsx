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
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const canvas = await html2canvas(cardCaptureRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        width: 600,
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

        {/* Hidden capture area - MATCHING THE PROVIDED IMAGE TEMPLATE */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={cardCaptureRef} style={{ width: '600px', backgroundColor: '#f5f6f7', padding: '0', borderRadius: '32px', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
            {/* Teal Header */}
            <div style={{ backgroundColor: '#1e8177', padding: '40px 48px', position: 'relative', borderTopLeftRadius: '32px', borderTopRightRadius: '32px' }}>
                <div style={{ paddingRight: '100px' }}>
                    <h2 style={{ fontSize: '42px', fontWeight: 'bold', color: '#ffffff', margin: '0', marginBottom: '8px', textTransform: 'capitalize' }}>{userProfile?.displayName || 'Gym Name'}</h2>
                    <p style={{ fontSize: '24px', fontWeight: '500', color: 'rgba(255,255,255,0.85)', margin: '0' }}>{userProfile?.phoneNumber || 'Contact Information'}</p>
                </div>
                {userProfile?.icon && (
                  <div style={{ position: 'absolute', top: '40px', right: '48px', width: '80px', height: '80px', backgroundColor: '#ffffff', borderRadius: '50%', padding: '10px', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                      <img src={userProfile.icon} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                )}
            </div>

            {/* Profile Section */}
            <div style={{ padding: '48px', paddingTop: '40px', display: 'flex', alignItems: 'center', gap: '32px' }}>
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid #1e8177', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={captureImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flexGrow: 1 }}>
                    <h3 style={{ fontSize: '36px', fontWeight: 'bold', color: '#2d3436', margin: '0', marginBottom: '4px' }}>{form.watch('name') || 'NAME'}</h3>
                    <p style={{ fontSize: '24px', color: '#636e72', fontWeight: '500', margin: '0' }}>ID: {form.watch('memberId') || 'ID'}</p>
                </div>
            </div>

            {/* Content Body */}
            <div style={{ padding: '0 48px 48px' }}>
                <div style={{ height: '1px', backgroundColor: '#dfe6e9', width: '100%', marginBottom: '40px' }} />
                
                {/* Plan Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#b2bec3', textTransform: 'uppercase', letterSpacing: '1px' }}>PLAN</span>
                    <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#2d3436' }}>{selectedPlan?.name || 'N/A'}</span>
                </div>

                {/* Date Labels Row */}
                <div style={{ display: 'flex', marginBottom: '12px' }}>
                    <div style={{ flex: '1' }}>
                        <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#b2bec3', textTransform: 'uppercase', letterSpacing: '1px' }}>START</span>
                    </div>
                    <div style={{ flex: '1' }}>
                        <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#b2bec3', textTransform: 'uppercase', letterSpacing: '1px' }}>EXPIRY</span>
                    </div>
                </div>

                {/* Date Values Row */}
                <div style={{ display: 'flex' }}>
                    <div style={{ flex: '1' }}>
                        <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#2d3436', margin: '0' }}>{form.watch('joinDate') ? format(parseISO(form.watch('joinDate')), 'dd MMM yyyy') : 'N/A'}</p>
                    </div>
                    <div style={{ flex: '1' }}>
                        <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#2d3436', margin: '0' }}>{form.watch('joinDate') && selectedPlan ? format(addMonths(parseISO(form.watch('joinDate')), selectedPlan.duration), 'dd MMM yyyy') : 'N/A'}</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
