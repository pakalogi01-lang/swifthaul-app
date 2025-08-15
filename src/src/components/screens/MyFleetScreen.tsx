
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, X, Map } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import DriverSignupForm from '../forms/DriverSignupForm';
import { useToast } from '@/hooks/use-toast';
import type { CreateDriverInput } from '@/schemas/driver';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from '../ui/input';

interface MyFleetScreenProps {
    currentUser: any;
}

const FleetMap = ({ fleet }: { fleet: any[] }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchedDriver, setSearchedDriver] = useState<any | null>(null);
    const [searchError, setSearchError] = useState('');
    
    const centerLat = 25.2048;
    const centerLng = 55.2708;

    const handleSearch = () => {
        setSearchError('');
        setSearchedDriver(null);
        if (!searchQuery) {
            setSearchError("Please enter a driver's name.");
            return;
        }

        const foundDriver = fleet.find(d => 
            d.fullName.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (foundDriver) {
            setSearchedDriver(foundDriver);
        } else {
            setSearchError("Driver not found. Please check the name and try again.");
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchedDriver(null);
        setSearchError('');
    }

    const onTripDrivers = fleet.filter(d => d.status === 'On-Trip' && d.currentLocation);

    return (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Map /> Fleet Live Location</CardTitle>
            <CardDescription>Real-time overview of your on-trip drivers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex gap-2">
                <Input 
                    id="driver-search-fleet" 
                    placeholder="Search your drivers by name..."
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
            <div className="h-64 w-full bg-secondary rounded-lg flex items-center justify-center relative overflow-hidden">
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
                            <AvatarImage src={searchedDriver.photoURL || `https://i.pravatar.cc/150?u=${searchedDriver.fullName}`} />
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


const MyFleetScreen: FC<MyFleetScreenProps> = ({ currentUser }) => {
    const [fleet, setFleet] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
    const { toast } = useToast();

     useEffect(() => {
        if (!currentUser?.id) return;
        
        const q = query(collection(db, "drivers"), where("companyId", "==", currentUser.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedDrivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFleet(fetchedDrivers);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser?.id]);

    const handleAddDriver = (driverData: CreateDriverInput) => {
        setIsAddDriverOpen(false);
        toast({
            title: "Driver Added!",
            description: `${driverData.fullName} has been added to your fleet.`
        });
    }

    return (
        <div className="p-4 space-y-6">
        <Sheet open={isAddDriverOpen} onOpenChange={setIsAddDriverOpen}>
            <Tabs defaultValue="drivers">
                <TabsList className="w-full flex">
                    <TabsTrigger value="drivers" className="flex-1">My Drivers</TabsTrigger>
                    <TabsTrigger value="locations" className="flex-1">Live Locations</TabsTrigger>
                </TabsList>
                <TabsContent value="drivers" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>Manage Your Drivers</span>
                                <SheetTrigger asChild>
                                    <Button size="sm">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Driver
                                    </Button>
                                </SheetTrigger>
                            </CardTitle>
                            <CardDescription>Assign jobs and track your fleet of drivers.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading ? <p>Loading fleet...</p> : fleet.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">You have not added any drivers to your fleet yet.</p>
                            ) : fleet.map(driver => (
                                <div key={driver.id} className="border rounded-md p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={driver.photoURL || `https://i.pravatar.cc/150?u=${driver.fullName}`} />
                                            <AvatarFallback>{driver.fullName.substring(0,2)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h4 className="font-semibold">{driver.fullName}</h4>
                                            <p className="text-sm text-muted-foreground">{driver.vehicleCat.replace(/-/g,' ')}</p>
                                        </div>
                                    </div>
                                    <Badge variant={driver.status === 'Available' ? 'secondary' : 'default'} className={driver.status === 'Available' ? 'text-green-500' : 'bg-blue-500'}>
                                        {driver.status}
                                    </Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="locations" className="mt-4">
                    <FleetMap fleet={fleet} />
                </TabsContent>
            </Tabs>
            <SheetContent className="overflow-y-auto">
            <SheetHeader>
                <SheetTitle>Add a New Driver</SheetTitle>
                <SheetDescription>
                    Fill out the form below to register a new driver for your fleet. They will not have an email login.
                </SheetDescription>
            </SheetHeader>
            <div className="py-4">
                <DriverSignupForm 
                    onSignup={handleAddDriver}
                    onSwitchToLogin={() => {}} // Not needed in sheet context
                    isSheet={true}
                    companyId={currentUser?.id}
                />
            </div>
        </SheetContent>
        </Sheet>
        </div>
    )
}

export default MyFleetScreen;
