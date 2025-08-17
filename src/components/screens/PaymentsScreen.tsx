import { FC, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, Download, Loader2, Send, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { downloadAsCSV } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notifyTraderForPaymentAction, hideAllUserHistoryAction } from '@/app/actions';
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

const PaymentsScreen: FC = () => {
    const { toast } = useToast();
    const [incomingPayments, setIncomingPayments] = useState<any[]>([]);
    const [outgoingPayouts, setOutgoingPayouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, "orders"), 
            where("status", "in", ["Delivered", "Cancelled"])
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const historyOrders = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                // Add a check for admin_user
                isHidden: doc.data().hiddenFor?.includes('admin_user') 
            }));
            
            // Filter out hidden orders for the view
            const deliveredOrders = historyOrders.filter(order => !order.isHidden);

            const incoming = deliveredOrders.map((order, i) => {
                const total = parseFloat(order.price || 0);
                const paid = parseFloat(order.amountPaidByTrader || 0);
                return {
                 id: `TR-PAY-${order.id}`, 
                 orderId: order.id,
                 orderIdShort: order.id.substring(0,6),
                 traderId: order.traderId,
                 date: order.createdAt?.toDate().toLocaleString() || new Date().toLocaleString(), 
                 amount: total, 
                 paidAmount: paid,
                 balance: total - paid,
                 type: 'Order Payment'
                }
            });
            setIncomingPayments(incoming);

            const outgoing = deliveredOrders.map(order => ({
                 id: `DR-PAY-${order.id.substring(0,6)}`,
                 orderId: order.id.substring(0,6),
                 date: order.createdAt?.toDate().toLocaleString() || new Date().toLocaleString(),
                 originalAmount: parseFloat(order.price),
                 driver: order.driver || 'Driver/Company', // Mock name
                 status: 'Paid'
            }));
            setOutgoingPayouts(outgoing);
            
            setLoading(false);
        });
        
        return () => unsubscribe();
    }, []);

    const handleDownload = (data: any[], filename: string) => {
        downloadAsCSV(data, filename);
        toast({
            title: 'Download Started',
            description: `The ${filename.replace(/-/g, ' ')} list is being downloaded.`
        })
    }
    
    const handleClearHistory = async () => {
        const result = await hideAllUserHistoryAction('admin_user', 'admin');
        if (result.success) {
            toast({
                title: 'History Cleared',
                description: 'The transaction history has been hidden from your view.',
            });
        } else {
             toast({
                title: 'Error Clearing History',
                description: result.error,
                variant: 'destructive',
            });
        }
    }

    const handleRequestPayment = async (payment: any) => {
        if (!payment.traderId) {
            toast({ title: 'Cannot send request', description: 'Trader information is missing for this order.', variant: 'destructive' });
            return;
        }

        const result = await notifyTraderForPaymentAction(payment.orderId, payment.traderId, `A payment of AED ${payment.balance.toFixed(2)} is due for order #${payment.orderIdShort}.`);
        if (result.success) {
            toast({
                title: 'Request Sent',
                description: 'Trader has been notified to settle the balance.',
            });
        } else {
            toast({
                title: 'Failed to Send Request',
                description: result.error,
                variant: 'destructive',
            });
        }
    }

  return (
    <div className="p-4 space-y-6">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>All Transactions</CardTitle>
                        <CardDescription>Review all platform payments and payouts.</CardDescription>
                    </div>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm" disabled={loading || (incomingPayments.length === 0 && outgoingPayouts.length === 0)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Clear History
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will hide all delivered and cancelled transactions from your history view. This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90">Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                <Tabs defaultValue="incoming-transactions">
                    <TabsList className="w-full grid md:grid-cols-2">
                        <TabsTrigger value="incoming-transactions">Incoming</TabsTrigger>
                        <TabsTrigger value="outgoing-transactions">Outgoing</TabsTrigger>
                    </TabsList>
                    <TabsContent value="incoming-transactions" className="mt-4 space-y-2">
                        <div className="flex justify-end mb-2">
                             <Button variant="outline" size="sm" onClick={() => handleDownload(incomingPayments, 'incoming-transactions')} disabled={incomingPayments.length === 0}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>
                        </div>
                        {incomingPayments.length === 0 ? <p className="text-center text-muted-foreground py-4">No incoming payments found.</p> : incomingPayments.map(payment => (
                            <Card key={payment.id} className="p-3">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                                    <div className="flex items-center gap-3 mb-2 md:mb-0">
                                        <div className="p-2 bg-green-500/20 rounded-full">
                                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">Order #{payment.orderIdShort}</p>
                                            <p className="text-xs text-muted-foreground">{payment.date} - {payment.type}</p>
                                        </div>
                                    </div>
                                    <div className="text-right w-full md:w-auto">
                                        <Badge variant="secondary" className="text-green-500">+ AED {payment.amount}</Badge>
                                        {payment.balance > 0 && 
                                            <p className="text-xs text-destructive">Balance: AED {payment.balance.toFixed(2)}</p>
                                        }
                                    </div>
                                </div>
                                {payment.balance > 0 && (
                                    <Button size="sm" className="w-full mt-3" onClick={() => handleRequestPayment(payment)}>
                                        <Send className="mr-2 h-4 w-4" />
                                        Request Payment From Trader
                                    </Button>
                                )}
                            </Card>
                        ))}
                    </TabsContent>
                    <TabsContent value="outgoing-transactions" className="mt-4 space-y-2">
                        <div className="flex justify-end mb-2">
                            <Button variant="outline" size="sm" onClick={() => handleDownload(outgoingPayouts, 'outgoing-payouts')} disabled={outgoingPayouts.length === 0}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>
                        </div>
                        {outgoingPayouts.length === 0 ? <p className="text-center text-muted-foreground py-4">No outgoing payouts found.</p> : outgoingPayouts.map(payout => {
                            const commission = payout.originalAmount * 0.02;
                            const finalAmount = payout.originalAmount - commission;
                            return (
                                <div key={payout.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 rounded-md bg-secondary">
                                    <div className="flex items-center gap-3 mb-2 md:mb-0">
                                        <div className="p-2 bg-red-500/20 rounded-full">
                                            <ArrowUpRight className="h-4 w-4 text-red-500" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">Payout to {payout.driver}</p>
                                            <p className="text-xs text-muted-foreground">Order #{payout.orderId} on {payout.date}</p>
                                        </div>
                                    </div>
                                    <div className="text-right w-full md:w-auto">
                                        <Badge variant="secondary" className="text-red-500">- AED {finalAmount.toFixed(2)}</Badge>
                                        <div className="flex items-center justify-end gap-2 mt-1">
                                            <p className="text-xs text-muted-foreground">2% fee: AED {commission.toFixed(2)}</p>
                                            <Badge variant={payout.status === 'Paid' ? 'outline' : 'default'} className={payout.status === 'Paid' ? 'text-green-500 border-green-500' : ''}>{payout.status}</Badge>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </TabsContent>
                </Tabs>
                )}
            </CardContent>
        </Card>
    </div>
  );
};
