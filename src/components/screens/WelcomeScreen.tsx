
"use client";

import { useState, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, User, Building, Shield } from 'lucide-react';
import TraderSignupForm from '../forms/TraderSignupForm';
import DriverSignupForm from '../forms/DriverSignupForm';
import TransportCompanySignupForm from '../forms/TransportCompanySignupForm';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmail, signInAdmin, sendPasswordResetEmailAction, loginCompanyDriverAction } from '@/app/auth/actions';
import { Loader2 } from 'lucide-react';

interface WelcomeScreenProps {
  onLogin: (userType: 'trader' | 'driver' | 'admin' | 'transport_company', identifier: string, isCompanyDriver?: boolean) => void;
  appLogoUrl: string | null;
}

const ForgotPasswordForm: FC<{ onSent: () => void }> = ({ onSent }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleReset = async () => {
        setLoading(true);
        const result = await sendPasswordResetEmailAction(email);
        setLoading(false);
        if(result.success) {
            toast({ title: 'Password Reset Email Sent', description: 'Please check your inbox to reset your password.' });
            onSent();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive'});
        }
    }

    return (
        <div className="space-y-4 pt-4">
             <h3 className="font-semibold text-lg border-b pb-2">Forgot Password</h3>
             <p className="text-sm text-muted-foreground">Enter your email address and we'll send you a link to reset your password.</p>
            <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleReset} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
            </Button>
        </div>
    )
}

const WelcomeScreen: FC<WelcomeScreenProps> = ({ onLogin, appLogoUrl }) => {
  const [activeTab, setActiveTab] = useState<'trader' | 'driver' | 'transport_company' | 'admin'>('trader');
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [driverName, setDriverName] = useState('');
  const [passport, setPassport] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    let result;
    if (activeTab === 'driver' && !email) { // This implies it's a company driver login
        result = await loginCompanyDriverAction(driverName, passport);
         if(result.success) {
            onLogin('driver', result.identifier!, true);
        } else {
            toast({ title: "Login Failed", description: result.error, variant: 'destructive' });
        }
    } else if (activeTab === 'admin') {
        result = await signInAdmin(email, password);
        if(result.success) {
            onLogin('admin', result.identifier!);
        } else {
            toast({ title: "Admin Login Failed", description: result.error, variant: 'destructive' });
        }
    } else {
        result = await signInWithEmail(email, password);
        if (result.success) {
            onLogin(activeTab, email);
        } else {
            toast({ title: "Login Failed", description: result.error, variant: 'destructive' });
        }
    }
    setIsLoading(false);
  };

  const renderLoginForm = () => {
    if (isForgotPassword) {
        return <ForgotPasswordForm onSent={() => setIsForgotPassword(false)} />;
    }

    if (activeTab === 'admin') {
        return (
            <div className="space-y-4 pt-4">
                <h3 className="font-semibold text-lg border-b pb-2">Admin Login</h3>
                 <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input id="admin-email" type="email" placeholder="admin@swifthaul.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input id="admin-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleLogin} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login as Admin
                </Button>
            </div>
        )
    }

    if (activeTab === 'driver') {
        return (
            <Tabs defaultValue="independent" className="pt-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="independent">Independent</TabsTrigger>
                    <TabsTrigger value="company">Company Driver</TabsTrigger>
                </TabsList>
                <TabsContent value="independent">
                     <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="driver-email">Email</Label>
                            <Input id="driver-email" type="email" placeholder="driver@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="driver-password">Password</Label>
                            <Input id="driver-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleLogin} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Login
                        </Button>
                     </div>
                </TabsContent>
                <TabsContent value="company">
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="driver-name">Full Name</Label>
                            <Input id="driver-name" placeholder="John Doe" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="driver-passport">Passport No.</Label>
                            <Input id="driver-passport" placeholder="AB12345" value={passport} onChange={(e) => setPassport(e.target.value)} />
                        </div>
                        <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleLogin} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Login
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
        )
    }

    return (
        <div className="space-y-4 pt-4">
            <h3 className="font-semibold text-lg border-b pb-2">{activeTab === 'trader' ? 'Trader / Consignee Login' : 'Transport Company Login'}</h3>
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)}/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}/>
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleLogin} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
            </Button>
        </div>
    )
  }

  const renderSignupForm = () => {
    switch(activeTab) {
        case 'trader':
            return <TraderSignupForm onSignup={() => setIsLogin(true)} onSwitchToLogin={() => setIsLogin(true)} />;
        case 'driver':
            return <DriverSignupForm onSignup={() => setIsLogin(true)} onSwitchToLogin={() => setIsLogin(true)} />;
        case 'transport_company':
             return <TransportCompanySignupForm onSignup={() => setIsLogin(true)} onSwitchToLogin={() => setIsLogin(true)} />;
        default:
            return null;
    }
  }

  return (
    <div className="p-4 flex flex-col justify-center items-center h-full">
        <div className="text-center mb-8">
            {appLogoUrl ? (
                <img src={appLogoUrl} alt="SwiftHaul Logo" className="w-24 h-24 mx-auto object-contain" />
            ) : (
                <Truck className="h-16 w-16 text-primary mx-auto" />
            )}
            <h1 className="text-3xl font-bold font-headline mt-4">SwiftHaul</h1>
            <p className="text-muted-foreground">Connecting Traders and Drivers Seamlessly</p>
        </div>
        
        <Card className="w-full max-w-sm">
            <CardHeader>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="trader" className="flex-col p-2 h-auto text-xs">
                            <User className="h-5 w-5 mb-1" />
                            Trader
                        </TabsTrigger>
                        <TabsTrigger value="driver" className="flex-col p-2 h-auto text-xs">
                            <Truck className="h-5 w-5 mb-1" />
                            Driver
                        </TabsTrigger>
                        <TabsTrigger value="transport_company" className="flex-col p-2 h-auto text-xs">
                            <Building className="h-5 w-5 mb-1" />
                            Company
                        </TabsTrigger>
                        <TabsTrigger value="admin" className="flex-col p-2 h-auto text-xs">
                           <Shield className="h-5 w-5 mb-1" />
                            Admin
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
                {isLogin ? renderLoginForm() : renderSignupForm()}
                
                {isLogin && activeTab !== 'admin' &&
                    <div className="text-center mt-4">
                         <Button variant="link" className="text-xs" onClick={() => setIsForgotPassword(true)}>Forgot Password?</Button>
                    </div>
                }

                {!isLogin && activeTab !== 'admin' &&
                    <div className="text-center mt-4">
                         <Button variant="link" className="text-xs" onClick={() => setIsLogin(true)}>Already have an account? Login</Button>
                    </div>
                }

                 {isLogin && activeTab !== 'admin' &&
                    <div className="text-center mt-2">
                        <Button variant="link" className="text-xs" onClick={() => setIsLogin(false)}>Don't have an account? Sign Up</Button>
                    </div>
                 }
            </CardContent>
        </Card>
    </div>
  );
};

export default WelcomeScreen;
