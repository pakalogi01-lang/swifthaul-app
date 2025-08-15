
import { FC, useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Truck, Download, Loader2, DollarSign, Trash2, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { downloadAsCSV } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { hideAllUserHistoryAction } from '@/app/actions';
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
import { Input } from '../ui/input';

interface OrderHistoryProps {
  onSelectOrder: (order: any) => void;
  userType: 'trader' | 'driver' | 'admin' | 'transport_company' | null;
  currentUser: any;
}

const OrderHistory: FC<OrderHistoryProps> = ({ onSelectOrder, userType, currentUser }) => {
    const { toast } = useToast();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const SERVICE_FEE_PERCENTAGE = 0.02; // 2% service fee

    useEffect(() => {
        if (!currentUser?.id) {
            setLoading(false);
            return;
        }

        const fetchOrders = async () => {
            setLoading(true);
            let q;
            const baseQueryConstraints = [
                where("status", "in", ["Delivered", "Cancelled"])
            ];
            
            let userIdToQuery = currentUser.id;
            let userRole = userType;

            if (userType === 'driver' && currentUser.companyId) {
                // This is a company driver, their history is managed by the company
                // But for now, we'll let them see their own.
                // In a more complex scenario, this might be disabled or show company history.
                userIdToQuery = currentUser.id; 
                userRole = 'driver';
            }


            if (userRole === 'admin') {
                q = query(collection(db, "orders"), ...baseQueryConstraints);
            } else if (userRole === 'trader') {
                q = query(collection(db, "orders"), where("traderId", "==", userIdToQuery), ...baseQueryConstraints);
            } else if (userRole === 'driver') {
                q = query(collection(db, "orders"), where("driverId", "==", userIdToQuery), ...baseQueryConstraints);
            } else if (userRole === 'transport_company') {
                // Transport company queries for orders assigned to its company ID
                q = query(collection(db, "orders"), where("driverId", "==", userIdToQuery), ...baseQueryConstraints);
            }

            if (!q) {
                setLoading(false);
                setHistory([]);
                return;
            }

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const orders = querySnapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        date: doc.data().createdAt?.toDate().toLocaleDateString() || new Date().toLocaleDateString(),
                    }))
                    .filter(order => !order.hiddenFor?.includes(currentUser.id))
                    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

                setHistory(orders);
                setLoading(false);
            }, (error) => {
                console.error(`Error fetching history for ${userType}:`, error);
                toast({ title: 'Error fetching history', variant: 'destructive' });
                setLoading(false);
            });

            return unsubscribe;
        };

        let unsubscribe: (() => void) | undefined;
        fetchOrders().then(unsub => {
            unsubscribe = unsub;
        });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };

    }, [userType, currentUser, toast]);
    
    const filteredHistory = useMemo(() => 
        history.filter(order => {
            const query = searchQuery.toLowerCase();
            return (
                order.id.toLowerCase().includes(query) ||
                order.from.toLowerCase().includes(query) ||
                order.to.toLowerCase().includes(query)
            );
        }),
    [history, searchQuery]);

    const getStatusIcon = (status: string) => {
        switch(status) {
            case 'Delivered': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'Cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
            default: return <Truck className="h-4 w-4 text-gray-500" />;
        }
    }
    
    const handleDownload = () => {
        downloadAsCSV(filteredHistory, 'order-history');
        toast({
            title: 'Download Started',
            description: 'Your order history is being downloaded.'
        })
    }
    
    const handleClearHistory = async () => {
        if (!currentUser?.id || !userType || userType === 'admin') {
             toast({ title: 'Error', description: 'Cannot clear history for this user type.', variant: 'destructive' });
             return;
        }
        
        const result = await hideAllUserHistoryAction(currentUser.id, userType);
        if (result.success) {
            toast({
                title: 'History Cleared',
                description: 'Your order history has been hidden from your view.',
            });
        } else {
             toast({
                title: 'Error',
                description: result.error,
                variant: 'destructive',
            });
        }
    }

  return (
    <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-headline">Past Orders</h2>
            <div className="flex items-center gap-2">
                 {userType !== 'admin' && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm" disabled={history.length === 0 || loading}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Clear History
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will hide all order records from your history view. This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90">Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 )}
                <Button variant="outline" size="sm" onClick={handleDownload} disabled={filteredHistory.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                </Button>
            </div>
        </div>
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search by ID, From, or To..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        {loading ? (
             <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="mx-auto h-12 w-12 animate-spin" />
                <p className="mt-4">Loading order history...</p>
            </div>
        ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
                <Truck className="mx-auto h-12 w-12" />
                <p className="mt-4">{searchQuery ? 'No orders match your search.' : 'You have no past orders.'}</p>
            </div>
        ) : (
             filteredHistory.map(order => {
                const orderPrice = parseFloat(order.price || 0);
                const displayAmount = userType === 'driver' || userType === 'transport_company' ? orderPrice * (1 - SERVICE_FEE_PERCENTAGE) : orderPrice;
                const formattedAmount = displayAmount.toFixed(2);
                const isPaid = order.paymentStatus === 'Fully Paid';

                return (
                    <Card key={order.id} onClick={() => onSelectOrder(order)} className="cursor-pointer hover:bg-secondary/50 transition-colors">
                        <div className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">Order #{order.id.substring(0, 6)}</CardTitle>
                                    <CardDescription>
                                        {order.from} to {order.to}
                                    </CardDescription>
                                </div>
                                <Badge variant={order.status === 'Delivered' ? 'outline' : 'destructive'} className={cn(order.status === 'Delivered' ? 'border-green-500' : 'border-red-500')}>
                                    {getStatusIcon(order.status)}
                                    <span className="ml-2">{order.status}</span>
                                </Badge>
                            </div>

                            <div className="text-sm text-muted-foreground mt-2 space-y-1">
                                <div className="flex justify-between items-center">
                                    <span>{order.date}</span>
                                    <span className="font-semibold text-foreground">{userType === 'driver' || userType === 'transport_company' ? `+ AED ${formattedAmount}` : `- AED ${formattedAmount}`}</span>
                                </div>
                                {order.vehicleType === 'heavy-vehicle' && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span>Trailer: {order.trailerLength}m, {order.trailerType}</span>
                                    </div>
                                )}
                                {(userType === 'driver' || userType === 'transport_company') && (
                                    <div className="flex justify-end">
                                        <Badge variant={isPaid ? 'secondary' : 'destructive'} className={cn('mt-1', isPaid && 'text-green-600')}>
                                            {isPaid ? <CheckCircle className="h-3 w-3 mr-1" /> : <DollarSign className="h-3 w-3 mr-1" />}
                                            {isPaid ? 'Paid Out' : 'Payout Pending'}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                )
            })
        )}
    </div>
  );
};

export default OrderHistory;
