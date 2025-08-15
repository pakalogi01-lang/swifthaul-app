
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin, User, Truck, Clock, Weight, FileText, Check, X, ChevronDown, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateOrderStatusAction, updateDriverStatusAction } from '@/app/actions';
import { VerificationBanner } from '../ui/VerificationBanner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

interface TransportCompanyDashboardProps {
    onViewOrder: (order: any) => void;
    currentUser: any;
}

const JobDetails: FC<{ order: any }> = ({ order }) => (
    <div className="space-y-3 pt-3 text-sm">
        <Separator />
         {order.vehicleType === 'heavy-vehicle' && (
             <div className="flex flex-col space-y-1">
                <span className="font-medium">Trailer Requirements:</span>
                <span className="text-muted-foreground text-xs">Length: {order.trailerLength}m, Type: {order.trailerType}</span>
            </div>
        )}
        <div className="flex items-center">
            <Weight className="mr-3 h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Weight:</span>
            <span className="ml-auto text-foreground">{order.weight} Tons</span>
        </div>
        <div className="flex flex-col">
            <div className="flex items-center mb-1">
                <FileText className="mr-3 h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Load Description:</span>
            </div>
            <p className="text-muted-foreground text-xs pl-7">{order.material}</p>
        </div>
        <div className="flex items-center">
            {order.tollPaidBySender ? <Check className="mr-3 h-4 w-4 text-green-500" /> : <X className="mr-3 h-4 w-4 text-red-500" />}
            <span className="font-medium">Toll Paid by Sender</span>
        </div>
            <div className="flex items-center">
            {order.waitingChargesPaidBySender ? <Check className="mr-3 h-4 w-4 text-green-500" /> : <X className="mr-3 h-4 w-4 text-red-500" />}
            <span className="font-medium">Waiting Charges Paid by Sender</span>
        </div>
    </div>
);


const TransportCompanyDashboard: FC<TransportCompanyDashboardProps> = ({ onViewOrder, currentUser }) => {
    const { toast } = useToast();
    const [availableJobs, setAvailableJobs] = useState<any[]>([]);
    const [isAvailable, setIsAvailable] = useState(currentUser?.status === 'Available');
    const [loading, setLoading] = useState(true);
    const [currentJob, setCurrentJob] = useState<any>(null);
    const isPending = currentUser?.status === 'Pending';

    useEffect(() => {
        if (!currentUser?.id || isPending) {
            setLoading(false);
            return;
        }

        const queries = [
            // Query for their current job
            query(collection(db, "orders"), where("status", "in", ["Pending Pickup", "In Transit"]), where("driverId", "==", currentUser.id)),
            // Query for available jobs 
            query(collection(db, "orders"), where("status", "==", "Pending Driver Assignment"))
        ];

        const unsubscribes = queries.map((q, index) => {
            return onSnapshot(q, (querySnapshot) => {
                if (index === 0) { // Current job
                    const activeJob = querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
                    setCurrentJob(activeJob);
                } else { // All available jobs
                    const jobs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setAvailableJobs(jobs);
                }
                setLoading(false);
            }, (error) => {
                 console.error("Error fetching jobs: ", error);
                 setLoading(false);
                 toast({ title: "Error fetching jobs", variant: "destructive" });
            });
        });
        
        const unsubscribe = () => unsubscribes.forEach(unsub => unsub());

        return () => unsubscribe();
    }, [currentUser, isPending, toast]);

    const handleAvailabilityChange = async (checked: boolean) => {
        setIsAvailable(checked);
        const newStatus = checked ? 'Available' : 'Offline';
        
        if (!currentUser?.id) {
            toast({ title: "Error", description: "Cannot update status: Company ID is missing.", variant: "destructive" });
            return;
        }
        
        const result = await updateDriverStatusAction({ driverId: currentUser.id, status: newStatus });
        
        if(result.success) {
            toast({
                title: checked ? 'You are now Online' : 'You are now Offline',
                description: checked ? 'You will start receiving new job requests.' : 'You will not receive new job requests.',
            });
        } else {
            setIsAvailable(!checked); // Revert UI on failure
            toast({
                title: "Update Failed",
                description: result.error,
                variant: "destructive",
            });
        }
    };

    const handleAcceptJob = async (jobId: string) => {
        const result = await updateOrderStatusAction({ 
            orderId: jobId, 
            status: 'Pending Pickup',
            driverId: currentUser.id // The company itself is the driver
        });
         if (result.success) {
            toast({
                title: "Job Accepted!",
                description: "The order is now in your active jobs list.",
            });
        } else {
            toast({
                title: "Failed to Accept Job",
                description: result.error,
                variant: "destructive",
            });
        }
    };

    const handleRejectJob = (jobId: string) => {
         setAvailableJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
         toast({
             title: 'Job Rejected',
             description: 'The job has been removed from your list.',
         })
    }

    return (
    <div className="p-4 space-y-6 relative">
        {isPending && <VerificationBanner />}
        
        <Card className={`${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    Availability
                    <Switch id="availability-mode" checked={isAvailable} onCheckedChange={handleAvailabilityChange} />
                </CardTitle>
                <CardDescription>Toggle to start receiving new job requests for your company.</CardDescription>
            </CardHeader>
        </Card>
        
        {currentJob && (
             <Card className={`border-accent cursor-pointer transition-shadow hover:shadow-lg ${isPending ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => onViewOrder(currentJob)}>
                <CardHeader>
                    <CardTitle>Current Job: #{currentJob.id.substring(0,6)}</CardTitle>
                    <CardDescription>{currentJob.from} to {currentJob.to}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Truck className="h-6 w-6 text-accent" />
                        <div className="w-full">
                           <p className="font-semibold text-accent">{currentJob.status}</p>
                           <p className="text-sm text-muted-foreground">See details for your next action.</p>
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        )}
        
        <div className={`${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-2xl font-bold font-headline mb-4">Available Jobs</h2>
            {!isAvailable ? (
                <div className="text-center py-12 text-muted-foreground bg-secondary rounded-lg">
                    <WifiOff className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">You are Offline</h3>
                    <p className="mt-1 text-sm">Turn on availability to see new jobs.</p>
                </div>
            ) : loading ? (
                 <p>Loading available jobs...</p>
            ) : availableJobs.length === 0 ? (
                 <div className="text-center py-12 text-muted-foreground bg-secondary rounded-lg">
                    <User className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">No Available Jobs</h3>
                    <p className="mt-1 text-sm">There are no available jobs on the platform right now.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {availableJobs.map(job => {
                        const displayPrice = job.price * 0.98;

                        return (
                            <Collapsible key={job.id} asChild>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex justify-between items-start text-lg">
                                            <span>{job.from}</span>
                                            <div className="text-right">
                                                <p className="text-accent font-bold">AED {displayPrice.toFixed(2)}</p>
                                                <p className="text-xs text-muted-foreground">You will get</p>
                                            </div>
                                        </CardTitle>
                                        <CardDescription className="flex items-center pt-1"><MapPin className="h-3 w-3 mr-1 text-muted-foreground" /> To: {job.to}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <Badge variant="outline">{job.vehicleType}</Badge>
                                            <CollapsibleTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    Details <ChevronDown className="h-4 w-4 ml-1" />
                                                </Button>
                                            </CollapsibleTrigger>
                                        </div>
                                        <CollapsibleContent>
                                            <JobDetails order={job} />
                                        </CollapsibleContent>
                                    </CardContent>
                                    <CardFooter>
                                        <div className="grid grid-cols-2 gap-2 w-full">
                                            <Button variant="outline" onClick={() => handleRejectJob(job.id)}>Reject</Button>
                                            <Button className="bg-primary hover:bg-primary/90" onClick={() => handleAcceptJob(job.id)}>Accept</Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            </Collapsible>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};

export default TransportCompanyDashboard;
