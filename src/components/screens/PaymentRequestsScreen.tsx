
import { FC, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Download, Loader2, DollarSign } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { downloadAsCSV } from '@/lib/utils';
import { onSnapshot, collection, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { recordPayoutToAction } from '@/app/actions';
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

const PayoutDialog: FC<{ request: any, onPayout: (amount: number) => void }> = ({ request, onPayout }) => {
    const [amount, setAmount] = useState<string>(request.requestType === 'Final' ? '' : String(request.amount));
    const { toast } = useToast();
    const displayName = request.profile?.fullName || request.profile?.companyName || "Recipient";

    const isFinalPayment = request.requestType === 'Final';
    const totalEarning = (parseFloat(request.orderData.price) || 0) * 0.98;
    const advancePaid = parseFloat(request.orderData.amountPaidToDriver || 0);
    const finalBalance = totalEarning - advancePaid;

    const handleConfirmPayout = () => {
        let payoutAmount = 0;
        if (isFinalPayment) {
            payoutAmount = finalBalance;
        } else {
            payoutAmount = parseFloat(amount);
            if (isNaN(payoutAmount) || payoutAmount <= 0) {
                toast({ title: "Invalid amount", variant: "destructive"});
                return;
            }
        }
        onPayout(payoutAmount);
    }
    
    return (
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Process Payout</AlertDialogTitle>
                <AlertDialogDescription>
                    You are paying <span className="font-bold">{displayName}</span> for order #{request.orderId.substring(0,6)}.
                </AlertDialogDescription>
            </AlertDialogHeader>
            
            {isFinalPayment ? (
                 <div className="space-y-2 py-2">
                     <div className="flex justify-between items-baseline"><span className="text-sm text-muted-foreground">Total Earning:</span><span className="font-semibold">AED {totalEarning.toFixed(2)}</span></div>
                     <div className="flex justify-between items-baseline"><span className="text-sm text-muted-foreground">Advance Paid:</span><span className="font-semibold">AED {advancePaid.toFixed(2)}</span></div>
                     <div className="flex justify-between items-baseline"><span className="text-sm font-bold">Final Payout:</span><span className="font-bold text-lg text-primary">AED {finalBalance.toFixed(2)}</span></div>
                 </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">The requested amount is AED {request.amount.toFixed(2)}. Enter the amount you want to pay out now.</p>
                    <Label htmlFor="payout-amount">Payout Amount (AED)</Label>
                    <Input 
                        id="payout-amount" 
                        type="number" 
                        placeholder="e.g. 150"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
            )}

            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmPayout}>Confirm Payout</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    )
}

const PaymentRequestsScreen: FC = () => {
    const { toast } = useToast();
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);

    useEffect(() => {
        const q = query(collection(db, "orders"), where("paymentRequests", "!=", []));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const requestsPromises: Promise<any>[] = [];
            snapshot.forEach(orderDoc => {
                const order = orderDoc.data();
                if (order.paymentRequests && order.paymentRequests.length > 0) {
                    order.paymentRequests
                        .filter((req: any) => req.status === 'Pending')
                        .forEach((req: any) => {
                            const promise = async () => {
                                let profile = null;
                                const requesterId = req.driverId || req.companyId;
                                const isCompany = !!req.companyId;
                                
                                if (requesterId) {
                                    const profileDocRef = doc(db, isCompany ? "transportCompanies" : "drivers", requesterId);
                                    const profileSnap = await getDoc(profileDocRef);
                                    if (profileSnap.exists()) {
                                        profile = { id: profileSnap.id, ...profileSnap.data() };
                                    }
                                }

                                return {
                                    ...req,
                                    orderId: orderDoc.id,
                                    from: order.from,
                                    to: order.to,
                                    profile: profile,
                                    orderData: order, // Pass the full order data
                                };
                            };
                            requestsPromises.push(promise());
                        });
                }
            });

            const resolvedRequests = await Promise.all(requestsPromises);
            
            resolvedRequests.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setPendingRequests(resolvedRequests);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleProcessPayout = async (request: any, amount: number) => {
        const result = await recordPayoutToAction({
            orderId: request.orderId,
            requestId: request.id,
            amount: amount,
        });
        
        const displayName = request.profile?.fullName || request.profile?.companyName || "the recipient";

        if (result.success) {
            toast({
                title: 'Payout Processed!',
                description: `AED ${amount.toFixed(2)} has been paid to ${displayName}.`,
            });
        } else {
             toast({
                title: 'Payout Failed',
                description: result.error,
                variant: 'destructive',
            });
        }
    };
    
    const handleDownload = (data: any[], filename: string) => {
        if (data.length === 0) return;
        const csvData = data.map(req => ({
            request_id: req.id,
            order_id: req.orderId,
            request_type: req.requestType,
            recipient_name: req.profile?.fullName || req.profile?.companyName,
            amount_requested: req.amount,
            status: req.status,
            date: req.createdAt.toDate().toLocaleString(),
        }))
        downloadAsCSV(csvData, filename);
        toast({
            title: 'Download Started',
            description: `The ${filename.replace(/-/g, ' ')} list is being downloaded.`
        })
    }

  return (
    <div className="p-4 space-y-6">
        <Card>
            <CardHeader>
                 <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Pending Payout Requests</CardTitle>
                        <CardDescription>Review and process incoming payment requests.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(pendingRequests, 'pending-payout-requests')} disabled={pendingRequests.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Download List
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                <div className="space-y-3">
                    {pendingRequests.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No pending payout requests.</p>
                    ) : (
                    <AlertDialog>
                        {pendingRequests.map(request => {
                            const displayName = request.profile?.fullName || request.profile?.companyName;
                            if (!displayName) return null;

                            const avatarFallback = displayName.substring(0,2) || '??';
                            const avatarUrl = request.profile?.photoURL || `https://i.pravatar.cc/150?u=${request.profile?.id}`;

                            return (
                                <div key={request.id} className="border p-3 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={avatarUrl} />
                                                <AvatarFallback>{avatarFallback}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-sm">Request from {displayName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Order #{request.orderId.substring(0,6)}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="destructive">{request.requestType} Due</Badge>
                                    </div>
                                    <div className="mt-2 text-center text-sm font-bold">
                                        Requested Amount: AED {request.amount.toFixed(2)}
                                    </div>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" className="w-full mt-3" onClick={() => setSelectedRequest(request)}>
                                            <DollarSign className="mr-2 h-4 w-4" />
                                            Approve & Pay
                                        </Button>
                                    </AlertDialogTrigger>
                                </div>
                            )
                        })}
                        {selectedRequest && <PayoutDialog request={selectedRequest} onPayout={(amount) => handleProcessPayout(selectedRequest, amount)} />}
                    </AlertDialog>
                    )}
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
};

export default PaymentRequestsScreen;
