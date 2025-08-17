
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Truck, Package, Clock, User, Building, Eye, Weight, FileText, Check, X, UserCheck, Trash2, FileBadge } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { notifyTraderForPaymentAction, deleteOrderAction } from '@/app/actions';
import { onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';
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
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog"


interface OrderTrackingProps {
  order: any;
  userType: 'trader' | 'driver' | 'transport_company' | 'admin' | null;
  currentUser: any;
  onViewProfile: (user: any, type: string) => void;
  onOrderDeleted: () => void;
}


const LiveTrackingMap: FC<{ order: any; driver: any | null }> = ({ order, driver }) => {
    const location = driver?.currentLocation;
    const origin = encodeURIComponent(order.from);
    const destination = encodeURIComponent(order.to);
    const waypoints = location ? encodeURIComponent(`${location.latitude},${location.longitude}`) : '';

    // The API key is not strictly required for the embed API to show a route,
    // but it's good practice and needed for other features if we expand.
    // Since we don't have one easily available on the client-side, we'll omit it for now.
    // The map will still render the route.
    const mapUrl = `https://www.google.com/maps/embed/v1/directions?origin=${origin}&destination=${destination}&waypoints=${waypoints}&mode=driving`;

    return (
        <div className="h-48 w-full bg-secondary rounded-lg flex items-center justify-center relative overflow-hidden">
             <iframe
                src={mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0"
            ></iframe>
        </div>
    );
};

const ContactCard: FC<{
    name: string;
    role: 'Driver' | 'Trader' | 'Admin' | 'Transport Company';
    avatarUrl: string;
    avatarFallback: string;
    details?: string;
    icon?: React.ReactNode;
    onViewProfile?: () => void;
    children?: React.ReactNode;
}> = ({ name, role, avatarUrl, avatarFallback, details, icon, onViewProfile, children }) => (
     <Card>
        <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
                {icon || <User />} {role} Details
            </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={avatarUrl} alt={role} />
                    <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-bold">{name}</p>
                    {details && <p className="text-sm text-muted-foreground">{details}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {children}
                {onViewProfile && (
                    <Button variant="outline" size="icon" onClick={onViewProfile}>
                        <Eye className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </CardContent>
    </Card>
);

const OrderStatusTimeline: FC<{ currentStatus: string }> = ({ currentStatus }) => {
    const statuses = [
        { name: 'Pending Driver Assignment', icon: UserCheck },
        { name: 'Pending Pickup', icon: Clock },
        { name: 'In Transit', icon: Truck },
        { name: 'Delivered', icon: Package }
    ];

    const currentStatusIndex = statuses.findIndex(s => s.name === currentStatus);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative pl-4">
                    {statuses.map((status, index) => {
                        const isCompleted = currentStatusIndex >= index;
                        const isCurrent = currentStatusIndex === index;
                        
                        return (
                            <div key={status.name} className="flex items-start gap-4 pb-8 last:pb-0">
                                {index < statuses.length - 1 && (
                                     <div className={cn(
                                        "absolute left-[17px] top-5 h-full w-0.5",
                                        isCompleted ? 'bg-primary' : 'bg-border'
                                     )}></div>
                                )}
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-9 w-9 rounded-full flex items-center justify-center shrink-0 z-10 border-2",
                                        isCompleted ? 'bg-primary border-primary' : 'bg-secondary border-border'
                                    )}>
                                        <status.icon className={cn("h-5 w-5", isCompleted ? 'text-primary-foreground' : 'text-secondary-foreground')} />
                                    </div>
                                    <p className={cn("font-medium", isCompleted ? 'text-foreground' : 'text-muted-foreground')}>
                                        {status.name}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};


const OrderTracking: FC<OrderTrackingProps> = ({ order, userType, currentUser, onViewProfile, onOrderDeleted }) => {
    const { toast } = useToast();
    const [currentOrder, setCurrentOrder] = useState(order);
    const [driverProfile, setDriverProfile] = useState<any>(null);
    const [traderProfile, setTraderProfile] = useState<any>(null);
    const [transportCompanyProfile, setTransportCompanyProfile] = useState<any>(null);
    
    useEffect(() => {
        if (!order?.id) return;

        const unsubOrder = onSnapshot(doc(db, "orders", order.id), async (docSnapshot) => {
            if (docSnapshot.exists()) {
                const orderData = { id: docSnapshot.id, ...docSnapshot.data() };
                setCurrentOrder(orderData);

                // Always fetch trader profile
                if (orderData.traderId && !traderProfile) {
                    const traderDocRef = doc(db, 'traders', orderData.traderId);
                    const traderDocSnap = await getDoc(traderDocRef);
                    if (traderDocSnap.exists()) {
                        setTraderProfile({ id: traderDocSnap.id, ...traderDocSnap.data() });
                    }
                }

                // Fetch driver or company profile and listen for updates
                if (orderData.driverId) {
                    let unsubProfile: (() => void) | null = null;
                    const setupListener = (collectionName: string, id: string) => {
                         if (unsubProfile) unsubProfile(); // Unsubscribe from previous listener if any
                        const profileRef = doc(db, collectionName, id);
                        unsubProfile = onSnapshot(profileRef, (snap) => {
                            if (snap.exists()) {
                                if (collectionName === 'drivers') {
                                    setDriverProfile({ id: snap.id, ...snap.data() });
                                    setTransportCompanyProfile(null);
                                } else {
                                    setTransportCompanyProfile({ id: snap.id, ...snap.data() });
                                    setDriverProfile(null);
                                }
                            }
                        });
                    }

                    // First check drivers collection
                    const driverRef = doc(db, 'drivers', orderData.driverId);
                    const driverSnap = await getDoc(driverRef);

                    if (driverSnap.exists()) {
                        setupListener('drivers', orderData.driverId);
                    } else {
                        // If not found in drivers, check transportCompanies
                         const companyRef = doc(db, 'transportCompanies', orderData.driverId);
                         const companySnap = await getDoc(companyRef);
                         if (companySnap.exists()) {
                             setupListener('transportCompanies', orderData.driverId);
                         }
                    }
                     return () => { if (unsubProfile) unsubProfile() };
                }

            } else {
                onOrderDeleted();
            }
        });

        return () => unsubOrder();
    }, [order.id, onOrderDeleted, traderProfile]);
    
    const handleAdminRequestToTrader = async () => {
        if (!currentOrder.traderId) return;
        const result = await notifyTraderForPaymentAction(currentOrder.id, currentOrder.traderId, `Payment is due for order #${currentOrder.id.substring(0,6)}.`);
        if (result.success) {
            toast({
                title: 'Request Sent',
                description: `Trader has been notified to make a payment to the platform.`,
            });
        } else {
            toast({ title: 'Failed to send request', description: result.error, variant: 'destructive' });
        }
    }

    const handleDeleteOrder = async () => {
        if (!currentOrder?.id) return;
        const result = await deleteOrderAction(currentOrder.id, currentUser.id);
        if (result.success) {
            toast({
                title: 'Order Hidden',
                description: `Order #${currentOrder.id.substring(0,6)} has been hidden from your view.`,
            });
            onOrderDeleted();
        } else {
            toast({
                title: 'Error Hiding Order',
                description: result.error,
                variant: 'destructive',
            });
        }
    }
    
  return (
    <Dialog>
    <div className="space-y-6 p-4">
        {currentOrder?.status === 'In Transit' && <LiveTrackingMap order={currentOrder} driver={driverProfile} />}
        
        <OrderStatusTimeline currentStatus={currentOrder?.status || 'Pending Driver Assignment'} />

        <Card>
            <CardHeader>
                <CardTitle>Load Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                 {currentOrder?.vehicleType === 'heavy-vehicle' && (
                    <>
                        <div className="flex flex-col space-y-1">
                            <span className="font-medium">Trailer Requirements:</span>
                            <span className="text-muted-foreground text-xs">Length: {currentOrder.trailerLength}m, Type: {currentOrder.trailerType}</span>
                        </div>
                        <Separator />
                    </>
                )}
                <div className="flex items-center">
                    <Weight className="mr-3 h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Weight:</span>
                    <span className="ml-auto text-foreground">{currentOrder?.weight} Tons</span>
                </div>
                <Separator />
                 <div className="flex flex-col">
                    <div className="flex items-center mb-2">
                        <FileText className="mr-3 h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Load Description:</span>
                    </div>
                    <p className="text-muted-foreground pl-8">{currentOrder?.material}</p>
                </div>
                <Separator />
                <div className="flex items-center">
                    {currentOrder?.tollPaidBySender ? <Check className="mr-3 h-5 w-5 text-green-500" /> : <X className="mr-3 h-5 w-5 text-red-500" />}
                    <span className="font-medium">Toll Paid by Sender</span>
                </div>
                 <div className="flex items-center">
                    {currentOrder?.waitingChargesPaidBySender ? <Check className="mr-3 h-5 w-5 text-green-500" /> : <X className="mr-3 h-5 w-5 text-red-500" />}
                    <span className="font-medium">Waiting Charges Paid by Sender</span>
                </div>
            </CardContent>
        </Card>

        {userType === 'trader' && (
             <div className="space-y-4">
                {driverProfile ? (
                     <ContactCard 
                        name={driverProfile.fullName || 'Driver Name'}
                        role="Driver"
                        avatarUrl={driverProfile.photoURL || `https://i.pravatar.cc/150?u=${driverProfile?.email || driverProfile?.fullName}`}
                        avatarFallback={driverProfile?.fullName?.[0] || 'D'}
                        details={driverProfile?.vehicleReg || "N/A"}
                        onViewProfile={() => onViewProfile(driverProfile, 'driver')}
                    />
                ) : transportCompanyProfile ? (
                     <ContactCard 
                        name={transportCompanyProfile.companyName}
                        role="Transport Company"
                        icon={<Building />}
                        avatarUrl={transportCompanyProfile.photoURL || `https://i.pravatar.cc/150?u=${transportCompanyProfile.email}`}
                        avatarFallback={transportCompanyProfile.companyName?.[0] || 'C'}
                        onViewProfile={() => onViewProfile(transportCompanyProfile, 'transport_company')}
                    />
                ) : null}
            </div>
        )}
        
        {(userType === 'driver' || userType === 'transport_company') && traderProfile && (
            <div className="space-y-4">
                 <ContactCard 
                    name={traderProfile.companyName || 'Trader'}
                    role="Trader"
                    avatarUrl={traderProfile.photoURL || `https://i.pravatar.cc/150?u=${traderProfile.email}`}
                    avatarFallback={traderProfile.companyName?.[0] || 'T'}
                    details={traderProfile.fullName}
                    onViewProfile={() => onViewProfile(traderProfile, 'trader')}
                />
            </div>
        )}

        {userType === 'admin' && (
            <div className="space-y-4">
                 {traderProfile && (
                     <ContactCard 
                        name={traderProfile.companyName || 'Trader'}
                        role="Trader"
                        avatarUrl={traderProfile.photoURL || `https://i.pravatar.cc/150?u=${traderProfile.email}`}
                        avatarFallback={traderProfile.companyName?.[0] || 'T'}
                        details={traderProfile.fullName}
                        onViewProfile={() => onViewProfile(traderProfile, 'trader')}
                    />
                 )}
                {driverProfile ? (
                    <ContactCard 
                        name={driverProfile.fullName}
                        role="Driver"
                        avatarUrl={driverProfile.photoURL || `https://i.pravatar.cc/150?u=${driverProfile.email || driverProfile.fullName}`}
                        avatarFallback={driverProfile.fullName?.[0] || 'D'}
                        details={driverProfile.vehicleReg}
                        onViewProfile={() => onViewProfile(driverProfile, 'driver')}
                    />
                ) : transportCompanyProfile ? (
                    <ContactCard 
                        name={transportCompanyProfile.companyName}
                        role="Transport Company"
                        icon={<Building />}
                        avatarUrl={transportCompanyProfile.photoURL || `https://i.pravatar.cc/150?u=${transportCompanyProfile.email}`}
                        avatarFallback={transportCompanyProfile.companyName?.[0] || 'C'}
                        onViewProfile={() => onViewProfile(transportCompanyProfile, 'transport_company')}
                    />
                ) : <p>Loading driver/company info...</p>}
                 <Button className="w-full" onClick={handleAdminRequestToTrader}>Request Payment from Trader</Button>
            </div>
        )}

        {userType === 'driver' && currentOrder?.status !== 'Delivered' && currentUser && !currentUser.email && (
             <p className="text-center text-sm text-muted-foreground p-4 bg-secondary rounded-lg">Your company manages this order's status. Contact your dispatcher for actions.</p>
        )}

        {(currentOrder?.status === 'Delivered' || currentOrder?.status === 'Cancelled') && userType !== 'admin' && (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hide Order From History
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will hide the order from your personal view. Other users will still see it. You cannot undo this action.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive hover:bg-destructive/90">
                        Continue
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
    </div>
    </Dialog>
  );
};

export default OrderTracking;

    
