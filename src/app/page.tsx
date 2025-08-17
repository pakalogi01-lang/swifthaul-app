
"use client";

import { useState, type ReactNode, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import {
  Truck,
  User,
  History,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  Bell,
  PlusCircle,
  Package,
  Settings,
  Store,
  Building,
  Users,
  Map,
  DollarSign,
  ArrowLeftRight,
  X,
  FileText,
  Users2,
  Wallet,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSubContent,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import WelcomeScreen from "@/components/screens/WelcomeScreen";
import TraderDashboard from "@/components/screens/TraderDashboard";
import DriverDashboard from "@/components/screens/DriverDashboard";
import PlaceOrder from "@/components/screens/PlaceOrder";
import OrderTracking from "@/components/screens/OrderTracking";
import OrderHistory from "@/components/screens/OrderHistory";
import ManageScreen from "@/components/screens/ManageScreen";
import TransportCompanyDashboard from "@/components/screens/TransportCompanyDashboard";
import ProfileScreen from "@/components/screens/ProfileScreen";
import MyFleetScreen from "@/components/screens/MyFleetScreen";
import PaymentsScreen from "@/components/screens/PaymentsScreen";
import PaymentRequestsScreen from "@/components/screens/PaymentRequestsScreen";
import TraderLogs from "@/components/screens/TraderLogs";
import TraderPayments from "@/components/screens/TraderPayments";
import DriverEarnings from "@/components/screens/DriverEarnings";
import SettingsScreen from "@/components/screens/SettingsScreen";
import { useNotifications } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";
import { onSnapshot, collection, query, where, getDocs, getDoc, doc, Unsubscribe, orderBy, deleteDoc } from "firebase/firestore";
import { db, getAuth, app } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { deleteNotificationAction, deleteAdminNotificationAction } from "./actions";
import { onAuthStateChanged } from "firebase/auth";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";


const AdminDashboard = dynamic(
  () => import('@/components/screens/AdminDashboard'),
  { 
    ssr: false,
    loading: () => (
      <div className="p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-4 grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
        </div>
         <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
        </div>
      </div>
    )
  }
);


type UserType = "trader" | "driver" | "admin" | "transport_company" | null;
export type View =
  | "welcome"
  | "trader_dashboard"
  | "driver_dashboard"
  | "admin_dashboard"
  | "transport_company_dashboard"
  | "place_order"
  | "track_order"
  | "history"
  | "manage"
  | "payments"
  | "payment_requests"
  | "profile"
  | "my_fleet"
  | "trader_logs"
  | "trader_payments"
  | "driver_earnings"
  | "settings";

export default function Home() {
  const [userType, setUserType] = useState<UserType>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [view, setView] = useState<View>("welcome");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [profileToView, setProfileToView] = useState<any>(null);
  const { notifications, setNotifications } = useNotifications();
  const { toast } = useToast();
  const [notificationListener, setNotificationListener] = useState<Unsubscribe | null>(null);
  const [userProfileListener, setUserProfileListener] = useState<Unsubscribe | null>(null);


  // Centralized state for user management
  const [traders, setTraders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsubDrivers = onSnapshot(collection(db, "drivers"), (snapshot) => {
      const fetchedDrivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDrivers(fetchedDrivers);
    });
    const unsubTraders = onSnapshot(collection(db, "traders"), (snapshot) => {
      const fetchedTraders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTraders(fetchedTraders);
    });
    const unsubCompanies = onSnapshot(collection(db, "transportCompanies"), (snapshot) => {
      const fetchedCompanies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCompanies(fetchedCompanies);
    });
    
    const settingsDoc = doc(db, 'settings', 'app_config');
    const unsubSettings = onSnapshot(settingsDoc, (doc) => {
        if(doc.exists()) {
            setAppLogoUrl(doc.data().logoUrl);
        }
    })

    return () => {
        unsubDrivers();
        unsubTraders();
        unsubCompanies();
        unsubSettings();
    };
  }, []);

  const setupNotificationListener = (type: UserType, userId: string) => {
    if (notificationListener) {
        notificationListener(); // Unsubscribe from previous listener
    }
    if (!type || !userId) {
        setNotifications([]);
        return;
    };
    
    let collectionName = '';
    let q;

    if(type === 'admin') {
        q = query(collection(db, `admin_notifications`), orderBy("createdAt", "desc"));
    } else {
        if(type === 'trader') collectionName = 'traders';
        else if(type === 'driver') collectionName = 'drivers';
        else if(type === 'transport_company') collectionName = 'transportCompanies';
        else return;
        
        q = query(
          collection(db, `${collectionName}/${userId}/notifications`),
          orderBy("createdAt", "desc")
        );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const userNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotifications(userNotifications);
    }, (error) => {
        console.error("Error fetching notifications:", error);
        toast({ title: "Could not load notifications", description: "Please check your connection or try again later.", variant: "destructive" });
    });

    setNotificationListener(() => unsubscribe);
  };
  
  const handleRemoveNotification = async (notificationId: string) => {
      if (!userType || !currentUser?.id || !notificationId) return;
      
      let result;
      if(userType === 'admin') {
          result = await deleteAdminNotificationAction(notificationId);
      } else {
          result = await deleteNotificationAction(userType, currentUser.id, notificationId);
      }

      if (!result.success) {
          toast({ title: "Failed to remove notification", description: result.error, variant: "destructive" });
      }
      // The real-time listener will update the UI automatically.
  };

  const handleNotificationClick = async (notification: any) => {
    if (notification.data?.view) {
      navigate(notification.data.view, notification.data);
    } else if (notification.data?.orderId) {
        const orderDoc = await getDoc(doc(db, 'orders', notification.data.orderId));
        if (orderDoc.exists()) {
            const orderData = { id: orderDoc.id, ...orderDoc.data() };
            
            // Default view is track_order
            let targetView: View = 'track_order'; 

            if (userType === 'trader' && notification.title === 'Payment Request') {
                targetView = 'trader_payments';
            }
            if ((userType === 'driver' || userType === 'transport_company') && (notification.title === 'Payment Processed' || notification.title === 'Request Accepted')) {
                 targetView = 'driver_earnings';
            }

            navigate(targetView, orderData);
        } else {
            toast({ title: 'Order not found', description: 'The associated order may have been deleted.', variant: 'destructive' });
        }
    }

    // Always remove the notification after it's clicked.
    await handleRemoveNotification(notification.id);
  };


  const setupUserProfileListener = (collectionName: string, docId: string) => {
    if (userProfileListener) {
      userProfileListener(); // Unsubscribe from the old listener
    }
    const unsub = onSnapshot(doc(db, collectionName, docId), (doc) => {
      if (doc.exists()) {
        const newProfileData = { id: doc.id, ...doc.data() };
        setCurrentUser(newProfileData);
        // If viewing someone else's profile, update it too
        if (profileToView && profileToView.user.id === doc.id) {
            setProfileToView(prev => ({...prev, user: newProfileData}));
        }
      } else {
        // Handle case where user document might be deleted
        logout();
      }
    });
    setUserProfileListener(() => unsub);
  };

  const fetchUserProfile = async (type: UserType, identifier: string, identifierField: 'email' | 'fullName' = 'email') => {
    if (!type || !identifier) return null;

    let collectionName: string;
    switch(type) {
        case 'trader': collectionName = 'traders'; break;
        case 'driver': collectionName = 'drivers'; break;
        case 'transport_company': collectionName = 'transportCompanies'; break;
        default: return null;
    }

    try {
        const q = query(collection(db, collectionName), where(identifierField, "==", identifier));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            setupUserProfileListener(collectionName, userDoc.id);
            return { id: userDoc.id, ...userDoc.data() };
        } else {
            console.warn(`No profile found for ${type} with ${identifierField} = ${identifier}`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching profile for ${type} from ${collectionName}:`, error);
        return null;
    }
};


  const login = async (type: "trader" | "driver" | "admin" | "transport_company", loginIdentifier: string, isCompanyDriver: boolean = false) => {
    if (type === "admin") {
        setView("admin_dashboard");
        const adminUser = { fullName: 'Admin User', email: 'admin@buraqfleet.com', id: 'admin_user'};
        setCurrentUser(adminUser);
        setUserType(type);
        setupNotificationListener(type, adminUser.id);
        return;
    }
    
    const identifierField = isCompanyDriver ? 'fullName' : 'email';
    const userProfile = await fetchUserProfile(type, loginIdentifier, identifierField);

    if (!userProfile) {
        toast({
            title: "Login Failed",
            description: `Could not find a user profile for that ${isCompanyDriver ? 'name' : 'email'}.`,
            variant: "destructive",
        });
        return;
    }
    
    setCurrentUser(userProfile);
    setUserType(type);
    setupNotificationListener(type, userProfile.id);

    if (type === "trader") setView("trader_dashboard");
    if (type === "driver") setView("driver_dashboard");
    if (type === "transport_company") setView("transport_company_dashboard");
  };

  const logout = () => {
    if (notificationListener) notificationListener();
    if (userProfileListener) userProfileListener();
    
    const auth = getAuth(app);
    auth.signOut(); // Sign out from Firebase Auth
    
    setUserType(null);
    setCurrentUser(null);
    setProfileToView(null);
    setView("welcome");
    setNotifications([]);
    setNotificationListener(null);
    setUserProfileListener(null);
  };

  const navigate = (newView: View, data?: any) => {
    if (newView === 'profile' && data) {
        const profileCollectionName = data.type === 'transport_company' ? 'transportCompanies' : `${data.type}s`;
        setupUserProfileListener(profileCollectionName, data.user.id);
        setProfileToView(data);
    } else {
        // When navigating away from a profile view, clear the specific listener
        if (view === 'profile' && profileToView) {
             if (userProfileListener) userProfileListener();
             // And re-establish the listener for the logged-in user
             if(currentUser && userType && userType !== 'admin'){
                const loggedInCollectionName = userType === 'transport_company' ? 'transportCompanies' : `${userType}s`;
                setupUserProfileListener(loggedInCollectionName, currentUser.id);
             }
        }
        setProfileToView(null);
    }
    if ((newView === 'track_order' || newView === 'trader_payments' || newView === 'driver_earnings') && data) {
        setSelectedOrder(data.orderId ? { id: data.orderId, ...data } : data);
    } else {
        setSelectedOrder(null);
    }
    setView(newView);
  };
  
  const getHeaderTitle = () => {
    switch(view) {
        case 'welcome': return 'BURAQFLEET';
        case 'trader_dashboard': return 'Trader Dashboard';
        case 'driver_dashboard': return 'Driver Dashboard';
        case 'admin_dashboard': return 'Admin Dashboard';
        case 'transport_company_dashboard': return 'Transport Co. Dashboard';
        case 'place_order': return 'Place New Order';
        case 'track_order': return `Order #${selectedOrder?.id?.substring(0, 6) || ''}`;
        case 'history': return 'Order History';
        case 'manage': return 'User Management';
        case 'payment_requests': return 'Payment Requests';
        case 'payments': return 'Payment History';
        case 'profile':
            const isViewingSelf = !profileToView || (currentUser && profileToView.user.id === currentUser.id);
            if (isViewingSelf) return 'My Profile';
            // When admin is viewing a profile, profileToView is set.
            const profileUser = profileToView?.user;
            const name = profileUser?.fullName || profileUser?.companyName || 'Profile';
            return `Viewing: ${name}`;
        case 'my_fleet': return 'My Fleet';
        case 'trader_logs': return 'Activity Logs';
        case 'trader_payments': return 'My Payments';
        case 'driver_earnings': return 'My Earnings';
        case 'settings': return 'App Settings';
        default: return 'BURAQFLEET';
    }
  };

  const renderView = () => {
    switch (view) {
      case "welcome":
        return <WelcomeScreen onLogin={login} appLogoUrl={appLogoUrl} />;
      case "trader_dashboard":
        return <TraderDashboard onPlaceOrder={() => navigate("place_order")} onViewOrder={(order) => navigate("track_order", order)} currentUser={currentUser} />;
      case "driver_dashboard":
        return <DriverDashboard onViewOrder={(order) => navigate("track_order", order)} currentUser={currentUser} />;
       case "transport_company_dashboard":
        return <TransportCompanyDashboard onViewOrder={(order) => navigate("track_order", order)} currentUser={currentUser} />;
      case "admin_dashboard":
        return <AdminDashboard onViewOrder={(order) => navigate("track_order", order)} traders={traders} drivers={drivers} companies={companies} />;
      case "place_order":
        return <PlaceOrder onOrderPlaced={() => navigate(getDashboardView())} traderId={currentUser?.id} />;
      case "track_order":
        return <OrderTracking order={selectedOrder} userType={userType} currentUser={currentUser} onViewProfile={(user, type) => navigate('profile', { user, type })} onOrderDeleted={() => navigate(getDashboardView())} />;
      case "history":
        return <OrderHistory onSelectOrder={(order) => navigate("track_order", order)} userType={userType} currentUser={currentUser} />;
      case "manage":
        return <ManageScreen 
                traders={traders}
                drivers={drivers}
                companies={companies}
                onViewProfile={(user, type) => navigate('profile', { user, type })}
                />;
      case "payment_requests":
        return <PaymentRequestsScreen />;
      case "payments":
        return <PaymentsScreen />;
      case "profile":
        const isViewingSelf = !profileToView || (profileToView?.user?.id === currentUser?.id);
        const profileUser = isViewingSelf ? currentUser : profileToView.user;
        const profileType = isViewingSelf ? userType : profileToView.type;
        return <ProfileScreen 
                    userType={profileType as 'trader' | 'driver' | 'transport_company' | 'admin' | null} 
                    profileData={profileUser} 
                    isViewingSelf={isViewingSelf}
                />;
      case "my_fleet":
        return <MyFleetScreen currentUser={currentUser} />;
      case "trader_logs":
        return <TraderLogs traderId={currentUser?.id} currentUser={currentUser} />;
      case "trader_payments":
        return <TraderPayments traderId={currentUser?.id} selectedOrder={selectedOrder} />;
      case "driver_earnings":
        return <DriverEarnings driverId={currentUser?.id} currentUser={currentUser} />;
      case "settings":
        return <SettingsScreen appLogoUrl={appLogoUrl} />;
      default:
        return <WelcomeScreen onLogin={login} appLogoUrl={appLogoUrl} />;
    }
  };

  const getDashboardView = () => {
    if (userType === 'trader') return 'trader_dashboard';
    if (userType === 'driver') return 'driver_dashboard';
    if (userType === 'admin') return 'admin_dashboard';
    if (userType === 'transport_company') return 'transport_company_dashboard';
    return 'welcome';
  }

  const showBackButton = view !== 'welcome' && !view.includes('dashboard');

  const handleBack = () => {
      if(view === 'my_fleet' && userType === 'transport_company') {
          setView('transport_company_dashboard');
          return;
      }
      if (view === 'track_order' && (userType === 'admin' || userType === 'trader' || userType === 'transport_company' || userType === 'driver')) {
          setView(getDashboardView());
          return;
      }
      if (view === 'profile' && userType === 'admin') {
          setView('manage');
          return;
      }
      if(view === 'profile') {
          setView(getDashboardView());
          return;
      }
      setView(getDashboardView());
  };

  const mainContainerClasses = cn(
    "w-full bg-background rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300",
    {
        'max-w-sm max-h-[90vh]': userType !== 'admin',
        'md:max-w-7xl md:max-h-[95vh] w-full': userType === 'admin',
        'max-w-sm max-h-[90vh]': !userType // Welcome screen
    }
);


  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-secondary p-4">
      <div className={mainContainerClasses}>
        {userType && (
          <header className="flex items-center justify-between p-4 border-b shrink-0">
            <div className="flex items-center gap-2">
              {showBackButton ? (
                <Button variant="ghost" size="icon" onClick={handleBack} className="-ml-2">
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              ) : (
                  appLogoUrl ? <img src={appLogoUrl} alt="App Logo" className="h-8 w-8 object-contain" /> : <Truck className="h-7 w-7 text-primary" />
              )}
              <h1 className="text-xl font-bold font-headline">{getHeaderTitle()}</h1>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && (
                      <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs">{notifications.length}</Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80" align="end">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <p className="px-2 py-4 text-center text-sm text-muted-foreground">No new notifications</p>
                  ) : (
                    notifications.map(notif => (
                      <DropdownMenuItem key={notif.id} className="flex items-start gap-3 cursor-pointer" onSelect={() => handleNotificationClick(notif)}>
                        <div className="flex-1 space-y-1">
                          <p className="font-medium">{notif.title}</p>
                          <p className="text-xs text-muted-foreground">{notif.description}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleRemoveNotification(notif.id); }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={currentUser?.photoURL || `https://i.pravatar.cc/150?u=${currentUser?.email}`} alt={userType || ''} />
                      <AvatarFallback>{currentUser?.fullName?.[0] || currentUser?.companyName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none capitalize">{currentUser?.fullName || currentUser?.companyName || userType?.replace('_', ' ')}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {currentUser?.email || 'email@example.com'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {userType !== 'admin' && (
                    <DropdownMenuItem onClick={() => navigate('profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  )}
                   {userType === 'transport_company' && (
                    <DropdownMenuItem onClick={() => navigate('my_fleet')}>
                        <Users2 className="mr-2 h-4 w-4" />
                        <span>My Fleet</span>
                    </DropdownMenuItem>
                  )}
                   {userType === 'admin' && (
                    <DropdownMenuItem onClick={() => navigate('settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        )}

        <div className="flex-1 overflow-y-auto">
          {renderView()}
        </div>

        {userType && userType !== 'admin' && (
          <footer className="grid grid-cols-4 justify-around p-2 border-t bg-card shrink-0">
            <Button variant="ghost" className={`flex-col h-auto p-2 ${view.includes('dashboard') ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => navigate(getDashboardView())}>
              <LayoutDashboard className="h-6 w-6" />
              <span className="text-xs mt-1">Dashboard</span>
            </Button>
            
            {(userType === 'driver' || userType === 'transport_company') && (
              <>
                <Button variant="ghost" className={`flex-col h-auto p-2 ${view === 'history' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => navigate("history")}>
                  <History className="h-6 w-6" />
                  <span className="text-xs mt-1">History</span>
                </Button>
                <Button variant="ghost" className={`flex-col h-auto p-2 ${view === 'driver_earnings' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => navigate("driver_earnings")}>
                  <DollarSign className="h-6 w-6" />
                  <span className="text-xs mt-1">Earnings</span>
                </Button>
              </>
            )}
            
            {userType === 'trader' && (
              <>
                <Button variant="ghost" className={`flex-col h-auto p-2 ${view === 'history' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => navigate("history")}>
                    <History className="h-6 w-6" />
                    <span className="text-xs mt-1">History</span>
                </Button>
                <Button variant="ghost" className={`flex-col h-auto p-2 ${view === 'trader_payments' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => navigate("trader_payments")}>
                    <DollarSign className="h-6 w-6" />
                    <span className="text-xs mt-1">Payments</span>
                </Button>
                <Button variant="ghost" className={`flex-col h-auto p-2 ${view === 'trader_logs' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => navigate("trader_logs")}>
                    <FileText className="h-6 w-6" />
                    <span className="text-xs mt-1">Logs</span>
                </Button>
              </>
            )}
          </footer>
        )}
        {userType === 'admin' && (
             <footer className="flex justify-around p-2 border-t bg-card shrink-0">
                <Button variant="ghost" className={`flex-col h-auto p-2 md:flex-row md:gap-2 ${view.includes('dashboard') ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => navigate(getDashboardView())}>
                    <LayoutDashboard className="h-6 w-6" />
                    <span className="text-xs mt-1 md:mt-0 md:text-sm">Dashboard</span>
                </Button>
                <Button variant="ghost" className={`flex-col h-auto p-2 md:flex-row md:gap-2 ${view === 'manage' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => navigate('manage')}>
                    <Users className="h-6 w-6" />
                    <span className="text-xs mt-1 md:mt-0 md:text-sm">Users</span>
                </Button>
                <Button variant="ghost" className={`flex-col h-auto p-2 md:flex-row md:gap-2 ${view === 'payment_requests' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => navigate('payment_requests')}>
                    <ArrowLeftRight className="h-6 w-6" />
                    <span className="text-xs mt-1 md:mt-0 md:text-sm">Pay Rqsts</span>
                </Button>
                <Button variant="ghost" className={`flex-col h-auto p-2 md:flex-row md:gap-2 ${view === 'payments' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => navigate('payments')}>
                    <Wallet className="h-6 w-6" />
                    <span className="text-xs mt-1 md:mt-0 md:text-sm">Payments</span>
                </Button>
            </footer>
        )}
      </div>
    </main>
  );
}
