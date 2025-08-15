
import { FC, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Package, Clock, Truck } from 'lucide-react';
import { onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { VerificationBanner } from '../ui/VerificationBanner';

interface TraderDashboardProps {
  onPlaceOrder: () => void;
  onViewOrder: (order: any) => void;
  currentUser: any;
}

const TraderDashboard: FC<TraderDashboardProps> = ({ onPlaceOrder, onViewOrder, currentUser }) => {
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isPending = currentUser?.status === 'Pending';

  useEffect(() => {
    if (!currentUser?.id) {
        setLoading(false);
        return;
    }
    
    const q = query(
        collection(db, "orders"), 
        where("traderId", "==", currentUser.id)
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch driver/company profiles
        const driverIds = [...new Set(ordersData.map(o => o.driverId).filter(Boolean))];
        let driverProfiles: any[] = [];
        if (driverIds.length > 0) {
            const driversQuery = query(collection(db, 'drivers'), where('__name__', 'in', driverIds));
            const companiesQuery = query(collection(db, 'transportCompanies'), where('__name__', 'in', driverIds));
            
            const [driverSnapshot, companySnapshot] = await Promise.all([getDocs(driversQuery), getDocs(companiesQuery)]);
            
            const drivers = driverSnapshot.docs.map(d => ({id: d.id, ...d.data()}));
            const companies = companySnapshot.docs.map(c => ({id: c.id, ...c.data()}));
            driverProfiles = [...drivers, ...companies];
        }

        const orders = ordersData
          .filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled')
          .map(order => {
              const profile = driverProfiles.find(p => p.id === order.driverId);
              return {
                  ...order,
                  driver: profile?.fullName || profile?.companyName || 'Awaiting',
              };
          });

        setActiveOrders(orders);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);


  return (
    <div className="space-y-6 p-4 relative">
        {isPending && <VerificationBanner />}

        <Card className={`w-full bg-primary text-primary-foreground shadow-lg ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
            <CardHeader>
                <CardTitle>Ready to Ship?</CardTitle>
                <CardDescription className="text-primary-foreground/80">Create a new shipment order in just a few clicks.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={onPlaceOrder} disabled={isPending}>
                    Place New Order
                </Button>
            </CardContent>
        </Card>

        <div className={`${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-2xl font-bold font-headline mb-4">Active Orders</h2>
            {loading ? (
                <p>Loading orders...</p>
            ) : activeOrders.length === 0 ? (
                 <p className="text-muted-foreground text-center py-8">You have no active orders.</p>
            ) : (
                <div className="space-y-4">
                    {activeOrders.map(order => (
                        <Card key={order.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onViewOrder(order)}>
                            <CardHeader className="pb-4">
                                <CardTitle className="flex justify-between items-start text-lg">
                                    <span>Order #{order.id.substring(0, 6)}</span>
                                    <Badge variant={order.status === 'In Transit' ? 'default' : 'secondary'} className={order.status === 'In Transit' ? 'bg-blue-500 text-white' : ''}>
                                        {order.status === 'In Transit' ? <Truck className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                                        {order.status}
                                    </Badge>
                                </CardTitle>
                                <CardDescription>To: {order.to}</CardDescription>
                            </CardHeader>
                            <CardContent className="py-2 text-sm text-muted-foreground">
                                <div className="flex justify-between items-center">
                                    <p>From: {order.from}</p>
                                    <p className="font-semibold text-foreground text-base">AED {order.price}</p>
                                </div>
                                <p>Driver: <span className="font-medium text-foreground">{order.driver}</span></p>
                            </CardContent>
                            <CardFooter className="flex justify-end pt-4">
                                <Button variant="ghost" size="sm" className="text-primary">
                                    Track Order <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default TraderDashboard;
