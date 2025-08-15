
import { FC, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FilePlus, CheckCircle, XCircle, Truck, FileText, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { onSnapshot, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { downloadAsCSV } from '@/lib/utils';
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

interface TraderLogsProps {
    traderId?: string;
    currentUser: any;
}

const formatTimestamp = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    return timestamp.toLocaleString();
};

const getIconForStatus = (status: string) => {
    switch (status) {
        case 'Order Created': return FilePlus;
        case 'Order Delivered': return CheckCircle;
        case 'Order Cancelled': return XCircle;
        default: return Truck;
    }
}


const TraderLogs: FC<TraderLogsProps> = ({ traderId, currentUser }) => {
    const { toast } = useToast();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!traderId) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "orders"),
            where("traderId", "==", traderId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const generatedLogs: any[] = [];
            snapshot.forEach(doc => {
                const order = doc.data();
                
                if (order.hiddenFor?.includes(traderId)) return;

                generatedLogs.push({
                    id: `${doc.id}-created`,
                    orderId: doc.id,
                    timestamp: order.createdAt,
                    status: 'Order Created',
                    description: `Order #${doc.id.substring(0, 6)} from ${order.from} to ${order.to}.`,
                    amount: `-${order.price}`
                });

                if (order.status === 'Delivered' && order.updatedAt) {
                     generatedLogs.push({
                        id: `${doc.id}-delivered`,
                        orderId: doc.id,
                        timestamp: order.updatedAt,
                        status: 'Order Delivered',
                        description: `Order #${doc.id.substring(0, 6)} was successfully delivered.`,
                        amount: ''
                    });
                }
                 if (order.status === 'Cancelled' && order.updatedAt) {
                     generatedLogs.push({
                        id: `${doc.id}-cancelled`,
                        orderId: doc.id,
                        timestamp: order.updatedAt,
                        status: 'Order Cancelled',
                        description: `Order #${doc.id.substring(0, 6)} was cancelled.`,
                        amount: ''
                    });
                }
            });

            generatedLogs.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

            setLogs(generatedLogs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching trader logs: ", error);
            toast({
                title: "Failed to load activity logs",
                description: "There was an error fetching your activity history.",
                variant: "destructive",
            });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [traderId, toast]);

    const handleDownload = () => {
        if (logs.length === 0) return;
        const dataToDownload = logs.map(log => ({
            Date: formatTimestamp(log.timestamp),
            Type: log.status,
            Description: log.description,
            Amount_AED: log.amount
        }));
        downloadAsCSV(dataToDownload, 'trader-activity-logs');
         toast({
            title: 'Download Started',
            description: 'Your activity logs are being downloaded.',
        });
    }

     const handleClearHistory = async () => {
        if (!currentUser?.id) {
             toast({ title: 'Error', description: 'Cannot identify current user.', variant: 'destructive' });
             return;
        }
        const result = await hideAllUserHistoryAction(currentUser.id, 'trader');
        if (result.success) {
            toast({
                title: 'History Cleared',
                description: 'Your activity logs have been hidden from your view.',
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
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold font-headline">Activity Timeline</h2>
                <div className="flex items-center gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm" disabled={logs.length === 0 || loading}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Clear
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will hide all activity logs from your history view. This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90">Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={logs.length === 0 || loading}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                    </Button>
                </div>
            </div>

             {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin" />
                    <p className="mt-4">Loading your activity logs...</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-secondary rounded-lg">
                    <FileText className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">No Log Activity</h3>
                    <p className="mt-1 text-sm">Your order activities will appear here.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {logs.map(log => {
                        const Icon = getIconForStatus(log.status);
                        return (
                        <Card key={log.id} className="p-3 group">
                           <div className="flex items-start gap-4">
                                <div className="p-2 bg-secondary rounded-full mt-1">
                                    <Icon className="h-5 w-5 text-secondary-foreground" />
                                </div>
                               <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">{log.status}</p>
                                        {log.amount && <Badge variant={log.amount.startsWith('+') ? 'default' : 'secondary'}>{`AED ${log.amount}`}</Badge>}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{log.description}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{formatTimestamp(log.timestamp)}</p>
                               </div>
                           </div>
                        </Card>
                    )})}
                </div>
            )}
        </div>
    )
}

export default TraderLogs;
