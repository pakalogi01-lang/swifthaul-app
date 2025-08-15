
import { FC, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ArrowDownLeft, DollarSign, Clock, Truck, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { onSnapshot, collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { downloadAsCSV } from '@/lib/utils';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { recordPaymentByTraderAction, notifyTraderForPaymentAction } from '@/app/actions';

interface TraderPaymentsProps {
    traderId?: string;
    selectedOrder?: any;
}

const PaymentOrderCard: FC<{ order: any, refProp?: React.Ref<HTMLDivElement> }> = ({ order, refProp }) => {
    const { toast } = useToast();
    const [paymentAmount, setPaymentAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalOffered = parseFloat(order.price || 0);
    const amountPaid = parseFloat(order.amountPaidByTrader || 0);
    const balanceDue = totalOffered - amountPaid;

    const handleRecordPayment = async (amountToPay: number) => {
        if (isNaN(amountToPay) || amountToPay <= 0) {
            toast({ title: 'Invalid Amount', description: 'Please enter a valid payment amount.', variant: 'destructive'});
            return;
        }
        if (amountToPay > balanceDue) {
             toast({ title: 'Invalid Amount', description: 'Payment cannot be greater than the balance due.', variant: 'destructive'});
            return;
        }

        setIsSubmitting(true);
        const result = await recordPaymentByTraderAction({ orderId: order.id, amount: amountToPay });

        if(result.success) {
            toast({ title: 'Payment Recorded', description: `AED ${amountToPay.toFixed(2)} has been recorded for this order.`});
            setPaymentAmount('');
        } else {
            toast({ title: 'Payment Failed', description: result.error, variant: 'destructive' });
        }
        setIsSubmitting(false);
    }
    
    return (
        <Card ref={refProp}>
            <CardHeader>
                <CardTitle className="flex justify-between items-start text-lg">
                    <span>Order #{order.id.substring(0, 6)}</span>
                    <Badge variant={order.status === 'In Transit' ? 'default' : 'secondary'} className={order.status === 'In Transit' ? 'bg-blue-500 text-white' : ''}>
                        {order.status === 'In Transit' ? <Truck className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                        {order.status}
                    </Badge>
                </CardTitle>
                 <CardDescription>
                    From: {order.from} to {order.to}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Total Offered:</span>
                    <span className="font-bold text-lg">AED {totalOffered.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-bold text-lg text-green-500">AED {amountPaid.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Balance Due:</span>
                    <span className="font-bold text-lg text-red-500">AED {balanceDue.toFixed(2)}</span>
                </div>

                {balanceDue > 0 && order.status === 'Delivered' && (
                     <CardFooter className="p-0 pt-4">
                        <Button onClick={() => handleRecordPayment(balanceDue)} disabled={isSubmitting} className="w-full">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Pay Remaining Balance (AED {balanceDue.toFixed(2)})
                        </Button>
                    </CardFooter>
                )}
            </CardContent>
             {balanceDue > 0 && order.status !== 'Delivered' && (
                <CardFooter>
                    <div className="w-full space-y-2">
                        <Label htmlFor={`payment-amount-${order.id}`}>Record Advance Payment</Label>
                        <div className="flex gap-2">
                        <Input id={`payment-amount-${order.id}`} type="number" placeholder="Enter amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                        <Button onClick={() => handleRecordPayment(parseFloat(paymentAmount))} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Pay
                        </Button>
                        </div>
                    </div>
                </CardFooter>
            )}
        </Card>
    )
}

const TraderPayments: FC<TraderPaymentsProps> = ({ traderId, selectedOrder }) => {
    const { toast } = useToast();
    const [activeOrders, setActiveOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalDue, setTotalDue] = useState(0);
    const cardRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

    useEffect(() => {
        if (!traderId) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "orders"),
            where("traderId", "==", traderId),
            where("status", "in", ["Pending Pickup", "In Transit", "Delivered"])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            const orders = snapshot.docs
                .map(doc => {
                    const orderData = doc.data();
                    const price = parseFloat(orderData.price || 0);
                    const paid = parseFloat(orderData.amountPaidByTrader || 0);
                    const balance = price - paid;

                    if (balance > 0) {
                       total += balance;
                    }

                    return { id: doc.id, ...orderData, balanceDue: balance };
                })
                .filter(order => order.balanceDue > 0); // Only show orders with a balance due

            setActiveOrders(orders);
            setTotalDue(total);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching trader payments: ", error);
            toast({
                title: "Failed to load payments",
                description: "There was an error fetching your payment history.",
                variant: "destructive",
            });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [traderId, toast]);

    useEffect(() => {
        if (selectedOrder && cardRefs.current[selectedOrder.id]) {
            cardRefs.current[selectedOrder.id]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
             cardRefs.current[selectedOrder.id]?.classList.add('ring-2', 'ring-primary', 'shadow-lg');
            setTimeout(() => {
                cardRefs.current[selectedOrder.id]?.classList.remove('ring-2', 'ring-primary', 'shadow-lg');
            }, 2000);
        }
    }, [selectedOrder, activeOrders]);
    

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
                    <p className="text-sm text-muted-foreground">Total Balance Due (Active Orders)</p>
                    <p className="text-3xl font-bold text-red-500">AED {totalDue.toFixed(2)}</p>
                </CardContent>
            </Card>

            <h2 className="text-xl font-bold font-headline">Active Orders Requiring Payment</h2>

             {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin" />
                    <p className="mt-4">Loading payment information...</p>
                </div>
            ) : activeOrders.length === 0 ? (
                 <div className="text-center py-12 text-muted-foreground bg-secondary rounded-lg">
                    <DollarSign className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">No Pending Payments</h3>
                    <p className="mt-1 text-sm">You have no active orders that require payment.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activeOrders.map(order => (
                        <PaymentOrderCard 
                            key={order.id} 
                            order={order} 
                            refProp={el => cardRefs.current[order.id] = el}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default TraderPayments;
