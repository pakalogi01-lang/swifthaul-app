
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ArrowUpRight, DollarSign, CheckCircle, Clock, Truck, Send, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { onSnapshot, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { downloadAsCSV } from '@/lib/utils';
import { createPaymentRequestAction, updateOrderStatusAction, hideAllUserHistoryAction } from '@/app/actions';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface DriverEarningsProps {
    driverId?: string;
    currentUser: any;
}

const formatTimestamp = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleDateString();
};

const ActiveJobCard: FC<{ order: any, driverProfile: any, companyProfile: any }> = ({ order, driverProfile, companyProfile }) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFinalSubmitting, setIsFinalSubmitting] = useState(false);
    const [advanceAmount, setAdvanceAmount] = useState('');
    const SERVICE_FEE_PERCENTAGE = 0.02;

    const totalOffered = parseFloat(order.price || 0);
    const amountPaidToDriver = parseFloat(order.amountPaidToDriver || 0);
    const totalEarning = totalOffered * (1 - SERVICE_FEE_PERCENTAGE);
    const balanceDue = totalEarning - amountPaidToDriver;
    
    const handlePaymentRequestToAdmin = async (type: 'Advance' | 'Final') => {
        let loaderToSet: React.Dispatch<React.SetStateAction<boolean>>;
        let statusToSet: 'In Transit' | 'Delivered' | undefined;
        let requestAmount = 0;
        let successMessage = '';
        
        if (type === 'Advance') {
            const parsedAdvance = parseFloat(advanceAmount);
            if (isNaN(parsedAdvance) || parsedAdvance <= 0) {
                toast({ title: 'Invalid Amount', description: "Please enter a valid advance amount.", variant: 'destructive' });
                return;
            }
            if (parsedAdvance > totalEarning) {
                toast({ title: 'Invalid Amount', description: "Advance cannot be more than the total earning.", variant: 'destructive' });
                return;
            }
            loaderToSet = setIsSubmitting;
            statusToSet = 'In Transit';
            requestAmount = parsedAdvance;
            successMessage = `Admin has been notified to process your advance payment of AED ${requestAmount.toFixed(2)}.`;
        } else { // Final
            loaderToSet = setIsFinalSubmitting;
            statusToSet = 'Delivered';
            requestAmount = balanceDue; // Request the remaining balance
            successMessage = 'Admin has been notified to process your final payment.';
        }
        
        loaderToSet(true);
        
        // Step 1: Update order status first, if applicable.
        if (statusToSet) {
             const statusResult = await updateOrderStatusAction({ orderId: order.id, status: statusToSet, driverId: driverProfile.id });
             if (!statusResult.success) {
                toast({ title: 'Failed to update order status', description: statusResult.error, variant: 'destructive' });
                loaderToSet(false);
                return;
            }
        }

        if (!driverProfile) {
            toast({ title: 'Cannot send request', description: "Driver details are not loaded yet.", variant: 'destructive' });
            loaderToSet(false);
            return;
        }

        // Step 2: Create payment request.
        const requestResult = await createPaymentRequestAction({
            orderId: order.id,
            driverId: driverProfile.id,
            driverName: driverProfile.fullName,
            companyId: companyProfile?.id,
            companyName: companyProfile?.companyName,
            requestType: type,
            amount: requestAmount,
        });

        if (requestResult.success) {
            toast({ title: 'Request Sent to Admin', description: successMessage });
            if(type === 'Advance') setAdvanceAmount('');
        } else {
            toast({ title: 'Failed to send request', description: requestResult.error, variant: 'destructive' });
        }
        
        loaderToSet(false);
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-start text-lg">
                    <span>Order #{order.id.substring(0, 6)}</span>
                     <Badge variant={order.status === 'In Transit' ? 'default' : 'secondary'} className={order.status === 'In Transit' ? 'bg-blue-500 text-white' : ''}>
                        {order.status === 'In Transit' ? <Truck className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                        {order.status}
                    </Badge>
                </CardTitle>
                <CardDescription>From: {order.from} to {order.to}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Total Earning:</span>
                    <span className="font-bold text-lg">AED {totalEarning.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-bold text-lg text-green-500">AED {amountPaidToDriver.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Balance Due:</span>
                    <span className="font-bold text-lg text-red-500">AED {balanceDue.toFixed(2)}</span>
                </div>
            </CardContent>
             <CardFooter className="flex flex-col gap-4">
                {order.status === 'Pending Pickup' && (
                    <div className="w-full space-y-2">
                        <Label htmlFor={`advance-amount-${order.id}`}>Request Advance (AED)</Label>
                        <div className="flex gap-2">
                            <Input 
                                id={`advance-amount-${order.id}`}
                                type="number" 
                                placeholder="Enter amount"
                                value={advanceAmount}
                                onChange={(e) => setAdvanceAmount(e.target.value)}
                            />
                            <Button onClick={() => handlePaymentRequestToAdmin('Advance')} disabled={isSubmitting || !advanceAmount}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Loaded, please pay advance
                            </Button>
                        </div>
                    </div>
                )}
                
                {order.status === 'In Transit' && (
                    <Button className="w-full" onClick={() => handlePaymentRequestToAdmin('Final')} disabled={isFinalSubmitting}>
                        {isFinalSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Send className="mr-2 h-4 w-4" />
                        Delivered & please pay final amount
                    </Button>
                )}
                {order.status === 'Delivered' && order.paymentStatus !== 'Fully Paid' && (
                    <Button className="w-full" onClick={() => handlePaymentRequestToAdmin('Final')} disabled={isFinalSubmitting}>
                        {isFinalSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Send className="mr-2 h-4 w-4" />
                        Request Final Payment
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}

const DriverEarnings: FC<DriverEarningsProps> = ({ driverId, currentUser }) => {
    const { toast } = useToast();
    const [completedJobs, setCompletedJobs] = useState<any[]>([]);
    const [activeJobs, setActiveJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const SERVICE_FEE_PERCENTAGE = 0.02;

    useEffect(() => {
        if (!driverId) {
            setLoading(false);
            return;
        }

        const userIdentifier = currentUser?.companyId || driverId;

        // Query for active orders (not yet fully paid and delivered)
        const activeQuery = query(
            collection(db, "orders"),
            where("driverId", "==", userIdentifier),
            where("status", "in", ["Pending Pickup", "In Transit", "Delivered"])
        );
        const unsubActive = onSnapshot(activeQuery, (snapshot) => {
            const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(job => job.status !== 'Delivered' || job.paymentStatus !== 'Fully Paid');
            setActiveJobs(jobs);
        }, (error) => {
            console.error("Error fetching active jobs: ", error);
            toast({ title: "Failed to load active jobs", variant: "destructive" });
        });

        // Query for completed and fully paid orders for earnings history
        const completedQuery = query(
            collection(db, "orders"),
            where("driverId", "==", userIdentifier),
            where("status", "in", ["Delivered", "Cancelled"])
        );

        const unsubCompleted = onSnapshot(completedQuery, (snapshot) => {
            let total = 0;
            const transactions = snapshot.docs
            .map(doc => {
                const order = doc.data();
                if (order.hiddenFor?.includes(userIdentifier)) return null;
                
                if (order.status !== 'Delivered' || order.paymentStatus !== 'Fully Paid') return null;

                const orderPrice = parseFloat(order.price || 0);
                const earnings = orderPrice * (1 - SERVICE_FEE_PERCENTAGE);
                total += earnings;

                return {
                    id: doc.id,
                    timestamp: order.createdAt,
                    orderId: doc.id.substring(0, 6),
                    amount: earnings,
                    from: order.from,
                    to: order.to,
                };
            })
            .filter(Boolean) as any[]; // Filter out nulls
            
            transactions.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
            setCompletedJobs(transactions);
            setTotalEarnings(total);
            setLoading(false);

        }, (error) => {
            console.error("Error fetching driver earnings: ", error);
            toast({
                title: "Failed to load earnings",
                description: "There was an error fetching your payment history.",
                variant: "destructive",
            });
            setLoading(false);
        });

        return () => {
            unsubActive();
            unsubCompleted();
        };
    }, [driverId, currentUser, toast]);

    const handleDownload = () => {
        if (completedJobs.length === 0) return;
        const dataToDownload = completedJobs.map(p => ({
            Date: formatTimestamp(p.timestamp),
            OrderID: `#${p.orderId}`,
            Route: `${p.from} to ${p.to}`,
            Earnings_AED: p.amount.toFixed(2),
        }));
        downloadAsCSV(dataToDownload, 'driver-earnings-history');
        toast({
            title: 'Download Started',
            description: 'Your earnings history is being downloaded.',
        });
    };
    
    const handleClearHistory = async () => {
        if (!currentUser?.id) {
             toast({ title: 'Error', description: 'Cannot identify current user.', variant: 'destructive' });
             return;
        }
        const userType = currentUser?.trnNumber ? 'transport_company' : 'driver';
        const result = await hideAllUserHistoryAction(currentUser.id, userType);
        if (result.success) {
            toast({
                title: 'History Cleared',
                description: 'Your earnings history has been hidden from your view.',
            });
        } else {
             toast({
                title: 'Error Clearing History',
                description: result.error,
                variant: 'destructive',
            });
        }
    }


    return (
        <div className="p-4 space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-primary" />
                        Financial Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Total Lifetime Earnings (From Fully Paid Jobs)</p>
                    <p className="text-3xl font-bold">AED {totalEarnings.toFixed(2)}</p>
                </CardContent>
            </Card>

            <h2 className="text-xl font-bold font-headline">Active Jobs & Payments</h2>
             {loading ? (
                <div className="text-center py-6 text-muted-foreground">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                    <p className="mt-2 text-sm">Loading active jobs...</p>
                </div>
            ) : activeJobs.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground bg-secondary rounded-lg">
                    <Truck className="mx-auto h-10 w-10" />
                    <h3 className="mt-4 text-md font-semibold">No Active Jobs</h3>
                    <p className="mt-1 text-xs">Your active jobs and their payment status will appear here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activeJobs.map(job => (
                        <ActiveJobCard key={job.id} order={job} driverProfile={currentUser} companyProfile={currentUser?.trnNumber ? currentUser : null} />
                    ))}
                </div>
            )}


            <div className="flex items-center justify-between pt-4">
                <h2 className="text-xl font-bold font-headline">Earnings History</h2>
                <div className="flex items-center gap-2">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm" disabled={completedJobs.length === 0 || loading}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Clear
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will hide all earnings records from your history view. This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90">Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={completedJobs.length === 0 || loading}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                    </Button>
                </div>
            </div>

             {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin" />
                    <p className="mt-4">Loading your earnings...</p>
                </div>
            ) : completedJobs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="mx-auto h-12 w-12" />
                    <p className="mt-4">You have no completed & fully paid jobs yet.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {completedJobs.map(payment => (
                         <div key={payment.id} className="flex items-center justify-between p-3 rounded-md bg-secondary group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 rounded-full">
                                <ArrowUpRight className="h-4 w-4 text-green-500" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">Order #{payment.orderId}</p>
                                    <p className="text-xs text-muted-foreground">{payment.from} to {payment.to}</p>
                                </div>
                            </div>
                             <div className="text-right">
                                <p className="font-semibold text-sm text-green-600">+ AED {payment.amount.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">{formatTimestamp(payment.timestamp)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default DriverEarnings;
