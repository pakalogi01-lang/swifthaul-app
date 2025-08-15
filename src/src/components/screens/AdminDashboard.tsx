
import { FC, useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Truck, Clock, Users, DollarSign, UserCheck, AlertCircle, Map, Activity, FilePlus, UserPlus, Building, Search, X, PieChart, BarChart } from 'lucide-react';
import StatCard from './StatCard';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { getOrdersAction, updateDriverStatusAction, updateTraderStatusAction, updateTransportCompanyStatusAction } from '@/app/actions';
import { onSnapshot, collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNotifications } from '@/hooks/use-notifications';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface AdminDashboardProps {
    onViewOrder: (order: any) => void;
    traders: any[];
    drivers: any[];
    companies: any[];
}

const formatTimeAgo = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'Just now';
    const now = new Date();
    const past = timestamp.toDate();
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    const secondsInMinute = 60;
    const secondsInHour = secondsInMinute * 60;
    const secondsInDay = secondsInHour * 24;

    if (diffInSeconds < secondsInMinute) {
        return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < secondsInHour) {
        return `${Math.floor(diffInSeconds / secondsInMinute)}m ago`;
    } else if (diffInSeconds < secondsInDay) {
        return `${Math.floor(diffInSeconds / secondsInHour)}h ago`;
    } else {
         return `${Math.floor(diffInSeconds / secondsInDay)}d ago`;
    }
};

const FleetMap: FC<{ drivers: any[] }> = ({ drivers }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchedDriver, setSearchedDriver] = useState<any | null>(null);
    const [searchError, setSearchError] = useState('');

    const handleSearch = () => {
        setSearchError('');
        setSearchedDriver(null);
        if (!searchQuery) {
            setSearchError("Please enter a driver's name or ID.");
            return;
        }

        const foundDriver = drivers.find(d => 
            d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
            d.id.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (foundDriver) {
            setSearchedDriver(foundDriver);
        } else {
            setSearchError("Driver not found. Please check the name or ID and try again.");
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchedDriver(null);
        setSearchError('');
    }

    const onTripDrivers = drivers.filter(d => d.status === 'On-Trip' && d.currentLocation);
    const centerLat = 25.2048;
    const centerLng = 55.2708;

    return (
    <Card className="h-full flex flex-col">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Map /> Live Fleet Map</CardTitle>
            <CardDescription>Real-time overview of all on-trip drivers. Search for a specific driver to pinpoint their location.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col">
             <div className="flex gap-2">
                <Input 
                    id="driver-search" 
                    placeholder="Search by driver name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}><Search className="h-4 w-4" /></Button>
                {(searchedDriver || searchError) && (
                    <Button variant="ghost" size="icon" onClick={clearSearch}><X className="h-4 w-4" /></Button>
                )}
            </div>
             {searchError && <p className="text-sm text-destructive">{searchError}</p>}
            <div className="h-64 w-full bg-secondary rounded-lg flex items-center justify-center relative overflow-hidden flex-1">
                 <iframe
                    src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d231262.2633390099!2d${centerLng}!3d${centerLat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sae!4v1676887968519!5m2!1sen!2sae`}
                    width="100%"
                    height="100%"
                    style={{ border:0 }}
                    allowFullScreen={false}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0"
                ></iframe>
                {searchedDriver && searchedDriver.currentLocation ? (
                     <div className="absolute z-10 text-center" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                        <p className="bg-background/80 text-foreground text-xs font-bold p-1 rounded-md mb-1">{searchedDriver.fullName}</p>
                         <Avatar className="h-10 w-10 border-4 border-accent shadow-lg">
                            <AvatarImage src={searchedDriver.photoURL || `https://i.pravatar.cc/150?u=${searchedDriver.email || searchedDriver.fullName}`} />
                            <AvatarFallback>{searchedDriver.fullName.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                     </div>
                ) : (
                    onTripDrivers.map((driver) => {
                        const lat = driver.currentLocation.latitude;
                        const lng = driver.currentLocation.longitude;
                        // Rough conversion of lat/lng to percentage for positioning on map
                        const top = (-(lat - centerLat) * 200 + 50) + '%';
                        const left = ((lng - centerLng) * 200 + 50) + '%';

                        return (
                             <div key={driver.id} className="absolute z-10" style={{ top, left, transform: 'translate(-50%, -50%)' }}>
                                <Avatar className="h-8 w-8 border-2 border-primary shadow-lg">
                                    <AvatarImage src={driver.photoURL || `https://i.pravatar.cc/150?u=${driver.email || driver.fullName}`} />
                                    <AvatarFallback>{driver.fullName.substring(0,2)}</AvatarFallback>
                                </Avatar>
                            </div>
                        )
                    })
                )}
            </div>
        </CardContent>
    </Card>
)};


const AdminDashboard: FC<AdminDashboardProps> = ({ onViewOrder, traders, drivers, companies }) => {
    const { toast } = useToast();
    const [pendingActions, setPendingActions] = useState<any[]>([]);
    const [activeOrders, setActiveOrders] = useState<any[]>([]);
    const [allOrders, setAllOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedOrders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllOrders(fetchedOrders);

            const active = fetchedOrders.filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled')
                .map(order => {
                    const driverProfile = drivers.find(d => d.id === order.driverId);
                    const companyProfile = companies.find(c => c.id === order.driverId);
                    
                    return {
                        ...order,
                        driver: driverProfile?.fullName || companyProfile?.companyName || 'Awaiting',
                        trader: traders.find(t => t.id === order.traderId)?.companyName || 'Unknown Trader'
                    }
                });

            setActiveOrders(active);
            setLoading(false);
        });
        
        return () => unsubscribe();
    }, [drivers, traders, companies]);
    
    useEffect(() => {
        const pendingDrivers = drivers.filter(d => d.status === 'Pending').map(d => ({
            id: d.id,
            type: 'Driver Approval',
            subject: `Driver: ${d.fullName}`,
            details: d.email,
            actionType: 'driver'
        }));
        
        const pendingTraders = traders.filter(t => t.status === 'Pending').map(t => ({
            id: t.id,
            type: 'Trader Approval',
            subject: `Trader: ${t.companyName}`,
            details: t.email,
            actionType: 'trader'
        }));
        
        const pendingCompanies = companies.filter(c => c.status === 'Pending').map(c => ({
            id: c.id,
            type: 'Company Approval',
            subject: `Company: ${c.companyName}`,
            details: c.email,
            actionType: 'transport_company'
        })); 
        
        setPendingActions([...pendingDrivers, ...pendingTraders, ...pendingCompanies]);

    }, [drivers, traders, companies])


    const handleApproval = async (itemId: string, itemType: 'driver' | 'trader' | 'transport_company', approve: boolean) => {
        const newStatus = approve ? 'Active' : 'Rejected';
        let result;
        let itemName = '';

        try {
            if(itemType === 'driver') {
                const driver = drivers.find(d => d.id === itemId);
                itemName = driver?.fullName;
                result = await updateDriverStatusAction({ driverId: itemId, status: newStatus });
            } else if (itemType === 'trader') {
                const trader = traders.find(t => t.id === itemId);
                itemName = trader?.companyName;
                result = await updateTraderStatusAction({ traderId: itemId, status: newStatus });
            } else if (itemType === 'transport_company') {
                const company = companies.find(c => c.id === itemId);
                itemName = company?.companyName;
                result = await updateTransportCompanyStatusAction({ companyId: itemId, status: newStatus });
            }

            if (result && result.success) {
                toast({
                    title: approve ? 'User Approved' : 'User Rejected',
                    description: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} '${itemName}' has been ${approve ? 'approved' : 'rejected'}. The user has been notified.`,
                });
            } else {
                toast({
                    title: 'Action Failed',
                    description: result ? result.error : `Could not update status for ${itemType}.`,
                    variant: 'destructive',
                });
            }
        } catch (e) {
            console.error("Approval failed:", e);
            toast({
                title: 'Action Failed',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        }
    }
    
    const totalRevenue = allOrders.filter(o => o.status === 'Delivered').reduce((sum, order) => sum + parseFloat(order.price || 0), 0);

  return (
    <div className="p-4 space-y-6">
        <div className="grid gap-4 md:grid-cols-4 grid-cols-2">
            <StatCard title="Total Revenue" value={`AED ${totalRevenue.toLocaleString()}`} icon={DollarSign} />
            <StatCard title="Total Orders" value={String(allOrders.length)} icon={Truck} />
            <StatCard title="All Users" value={String(traders.length + drivers.length + companies.length)} icon={Users} />
            <StatCard title="Pending Approvals" value={String(pendingActions.length)} icon={AlertCircle} />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart/> Monthly Overview</CardTitle>
                    <CardDescription>Revenue and total orders per month.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="flex items-center justify-center h-[250px] w-full bg-secondary rounded-md">
                        <p className="text-muted-foreground">Charts temporarily disabled</p>
                    </div>
                </CardContent>
            </Card>
             <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PieChart/> Order Status Distribution</CardTitle>
                    <CardDescription>Current breakdown of all order statuses.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                     <div className="flex items-center justify-center h-[250px] w-full bg-secondary rounded-md">
                        <p className="text-muted-foreground">Charts temporarily disabled</p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
                {pendingActions.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><AlertCircle /> Pending Approvals</CardTitle>
                            <CardDescription>Review and act on new user registrations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {pendingActions.map((action) => (
                                <div key={action.id} className="border p-3 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{action.type}</p>
                                            <p className="text-sm text-muted-foreground">{action.subject}</p>
                                            <p className="text-xs text-muted-foreground">{action.details}</p>
                                        </div>
                                        <Badge variant='secondary'>
                                            {action.actionType === 'driver' ? <UserCheck className="mr-1 h-3 w-3" /> : <Building className="mr-1 h-3 w-3" />}
                                            New
                                        </Badge>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => handleApproval(action.id, action.actionType, false)}>Reject</Button>
                                        <Button size="sm" className="w-full" onClick={() => handleApproval(action.id, action.actionType, true)}>Approve</Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
                 <div>
                    <h2 className="text-2xl font-bold font-headline mb-4">All Active Orders</h2>
                    {loading ? (
                        <p>Loading orders...</p>
                    ) : activeOrders.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No active orders at the moment.</p>
                    ) : (
                        <div className="space-y-4">
                            {activeOrders.map(order => (
                                <Card key={order.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onViewOrder(order)}>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="flex justify-between items-start text-lg">
                                            <span>Order #{order.id.substring(0,6)}</span>
                                            <Badge variant={order.status === 'In Transit' ? 'default' : 'secondary'} className={order.status === 'In Transit' ? 'bg-blue-500 text-white' : ''}>
                                                {order.status === 'In Transit' ? <Truck className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                                                {order.status}
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="py-2 text-sm text-muted-foreground">
                                        <div className="flex justify-between">
                                            <p>From: {order.from}</p>
                                            <p className="text-foreground font-bold">AED {order.price}</p>
                                        </div>
                                        <p>To: {order.to}</p>
                                        <p>Trader: <span className="font-medium text-foreground">{order.trader}</span></p>
                                        <p>Driver: <span className="font-medium text-foreground">{order.driver}</span></p>
                                    </CardContent>
                                    <CardFooter className="flex justify-end pt-4">
                                        <Button variant="ghost" size="sm" className="text-primary">
                                            View Details <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="lg:col-span-1">
                 <FleetMap drivers={drivers} />
            </div>
        </div>
    </div>
  );
};

export default AdminDashboard;
