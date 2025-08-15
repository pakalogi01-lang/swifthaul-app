
import type { FC } from 'react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, MapPin, WifiOff, Truck, User, Weight, FileText, Check, X, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateOrderStatusAction, updateDriverStatusAction, updateDriverLocationAction } from '@/app/actions';
import { VerificationBanner } from '../ui/VerificationBanner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

interface DriverDashboardProps {
    onViewOrder: (order: any) => void;
    currentUser: any;
}

const JobDetails: FC<{ order: any }> = ({ order }) => (
    <div className="space-y-3 pt-3 text-sm">
        <Separator />
        {order.vehicleType === 'heavy-vehicle' && (
             <div className="flex flex-col space-y-1">
                <span className="font-medium">Trailer Requirements:</span>
                <span className="ml-auto text-foreground text-xs">Length: {order.trailerLength}m, Type: {order.trailerType}</span>
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


const DriverDashboard: FC<DriverDashboardProps> = ({ onViewOrder, currentUser }) => {
  const { toast } = useToast();
  const driverVehicleType = currentUser?.vehicleCat || '3-tonn';
  // A company driver is identified by not having an email.
  const isCompanyDriver = !currentUser?.email;
  const companyDriverName = currentUser?.fullName || 'Moiz Ali';
  const isPending = currentUser?.status === 'Pending';
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);


  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [isAvailable, setIsAvailable] = useState(currentUser?.status === 'Available');
  const [loading, setLoading] = useState(true);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [assignedJobs, setAssignedJobs] = useState<any[]>([]);


  useEffect(() => {
    if (!currentUser?.id || isPending) {
        setLoading(false);
        return;
    }

    setLoading(true);

    const baseAvailableJobsQuery = [
        where("status", "==", "Pending Driver Assignment"),
        where("vehicleType", "==", currentUser.vehicleCat)
    ];

    if (currentUser.vehicleCat === 'heavy-vehicle') {
        baseAvailableJobsQuery.push(where("trailerLength", "==", currentUser.trailerLength));
        baseAvailableJobsQuery.push(where("trailerType", "==", currentUser.trailerType));
    }

    const queries = [
        // Query for their current job
        query(collection(db, "orders"), where("status", "in", ["Pending Pickup", "In Transit"]), where("driverId", "==", currentUser.id)),
        // Query for available jobs matching their vehicle
        query(collection(db, "orders"), ...baseAvailableJobsQuery)
    ];

    const unsubscribes = queries.map((q, index) => {
        return onSnapshot(q, (querySnapshot) => {
            if (index === 0) { // Current job
                const activeJob = querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
                setCurrentJob(activeJob);
            } else { // Available jobs
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
  
  
   useEffect(() => {
    const isDriverOnTrip = currentUser?.status === 'On-Trip';

    if (isDriverOnTrip) {
      // Start sending location updates
      locationIntervalRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await updateDriverLocationAction(currentUser.id, { latitude, longitude });
          },
          (error) => {
            console.error('Error getting location:', error);
            // Optionally, inform the user that location tracking isn't working
          },
          { enableHighAccuracy: true }
        );
      }, 30000); // Update every 30 seconds
    } else {
      // Stop sending location updates
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    }

    return () => {
      // Cleanup on component unmount
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, [currentUser?.status, currentUser?.id]);


  const handleAvailabilityChange = async (checked: boolean) => {
    setIsAvailable(checked);
    const newStatus = checked ? 'Available' : 'Offline';
    
    if (!currentUser?.id || isCompanyDriver) {
        toast({ title: "Error", description: "Cannot update status: Driver ID is missing or you are a company driver.", variant: "destructive" });
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
        driverId: currentUser?.id 
    });
     if (result.success) {
        toast({
            title: "Job Accepted!",
            description: "The order is now in your active jobs list.",
        });
        // The real-time listener will automatically update the UI
    } else {
        toast({
            title: "Failed to Accept Job",
            description: result.error,
            variant: "destructive",
        });
    }
  };

  const handleRejectJob = (jobId: string) => {
     // In a real app, you might want to log this or hide it for a period.
     // For now, we'll just filter it from the current view.
     setAvailableJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
     toast({
         title: 'Job Rejected',
         description: 'The job has been removed from your list.',
     })
  }

  const renderJobs = () => {
      if (isCompanyDriver) {
          return assignedJobs;
      }
      return availableJobs;
  }

  return (
    <div className="space-y-6 p-4 relative">
        {isPending && <VerificationBanner />}
        <Card className={`${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    Availability
                    <Switch id="availability-mode" checked={isAvailable} onCheckedChange={handleAvailabilityChange} disabled={isCompanyDriver}/>
                </CardTitle>
                <CardDescription>{isCompanyDriver ? "Your availability is managed by your company." : "Toggle to start receiving new job requests."}</CardDescription>
            </CardHeader>
        </Card>
        
        {currentJob && !isCompanyDriver && (
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
            <h2 className="text-2xl font-bold font-headline mb-4">{isCompanyDriver ? 'Assigned Jobs' : 'Available Jobs'}</h2>
            {!isAvailable && !isCompanyDriver ? (
                <div className="text-center py-12 text-muted-foreground bg-secondary rounded-lg">
                    <WifiOff className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">You are Offline</h3>
                    <p className="mt-1 text-sm">Turn on availability to see new jobs.</p>
                </div>
            ) : loading ? (
                 <p>Loading available jobs...</p>
            ) : renderJobs().length === 0 ? (
                 <div className="text-center py-12 text-muted-foreground bg-secondary rounded-lg">
                    <User className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">{isCompanyDriver ? 'No Assigned Jobs' : 'Your dispatcher has not assigned any jobs to you.'}</h3>
                    <p className="mt-1 text-sm">{isCompanyDriver ? 'Check back later for new assignments.' : 'No jobs match your vehicle type.'}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {renderJobs().map(job => {
                        const displayPrice = isCompanyDriver ? 0 : (job as any).price * 0.98;

                        return (
                            <Collapsible key={job.id} asChild>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex justify-between items-start text-lg">
                                            <span>{job.from}</span>
                                            {!isCompanyDriver && 
                                                <div className="text-right">
                                                    <p className="text-accent font-bold">AED {displayPrice.toFixed(2)}</p>
                                                    <p className="text-xs text-muted-foreground">You will get</p>
                                                </div>
                                            }
                                        </CardTitle>
                                        <CardDescription className="flex items-center pt-1"><MapPin className="h-3 w-3 mr-1 text-muted-foreground" /> To: {job.to}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <Badge variant="outline">{job.vehicleType}</Badge>
                                            {isCompanyDriver && <Badge variant="secondary" className="ml-2">{job.status}</Badge>}
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
                                        {isCompanyDriver ? (
                                            <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => onViewOrder(job)}>View Details</Button>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2 w-full">
                                                <Button variant="outline" onClick={() => handleRejectJob(job.id)}>Reject</Button>
                                                <Button className="bg-primary hover:bg-primary/90" onClick={() => handleAcceptJob(job.id)}>Accept</Button>
                                            </div>
                                        )}
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

export default DriverDashboard;
