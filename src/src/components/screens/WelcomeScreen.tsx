
import { useState, type FC, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, User, Building, Loader2, UserCog, ArrowLeft } from 'lucide-react';
import DriverSignupForm from '../forms/DriverSignupForm';
import { Separator } from '../ui/separator';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmail, sendPasswordResetEmailAction, loginCompanyDriverAction, signInAdmin } from '@/app/auth/actions';
import TraderSignupForm from '../forms/TraderSignupForm';
import TransportCompanySignupForm from '../forms/TransportCompanySignupForm';
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
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';


interface WelcomeScreenProps {
  onLogin: (userType: 'trader' | 'driver' | 'admin' | 'transport_company', loginIdentifier: string, isCompanyDriver?: boolean) => void;
  appLogoUrl: string | null;
}

const ForgotPasswordDialog: FC<{email: string, onEmailChange: (email: string) => void}> = ({ email, onEmailChange }) => {
    const { toast } = useToast();
    const [isSending, setIsSending] = useState(false);

    const handleSendResetLink = async () => {
        if(!email) {
            toast({ title: "Email is required", variant: "destructive" });
            return;
        }
        setIsSending(true);
        const result = await sendPasswordResetEmailAction(email);
        setIsSending(false);

        if (result.success) {
            toast({
                title: "Reset Link Sent",
                description: "If an account exists for this email, you will receive a password reset link shortly.",
            });
        } else {
            // We show a generic message for security reasons (to not reveal which emails are registered)
            toast({
                title: "Reset Link Sent",
                description: "If an account exists for this email, you will receive a password reset link shortly.",
            });
        }
    }


    return (
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Forgot Your Password?</AlertDialogTitle>
            <AlertDialogDescription>
                No problem. Enter your email address below and we'll send you a link to reset your password.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
                <Label htmlFor="reset-email">Email Address</Label>
                <Input 
                    id="reset-email" 
                    type="email" 
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSendResetLink} disabled={isSending}>
                    {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    )
}

const WelcomeScreen: FC<WelcomeScreenProps> = ({ onLogin, appLogoUrl }) => {
  const { toast } = useToast();
  const [showTraderSignup, setShowTraderSignup] = useState(false);
  const [showDriverSignup, setShowDriverSignup] = useState(false);
  const [showTransportCompanySignup, setShowTransportCompanySignup] = useState(false);
  
  // State for each form
  const [traderEmail, setTraderEmail] = useState('');
  const [traderPassword, setTraderPassword] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPassword, setCompanyPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  
  const [companyDriverName, setCompanyDriverName] = useState('');
  const [companyDriverPassport, setCompanyDriverPassport] = useState('');
  
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

  // Admin login view state
  const [loginView, setLoginView] = useState<'default' | 'admin'>('default');
  const [adminClickCount, setAdminClickCount] = useState(0);

  const handleAdminSecretClick = () => {
      const newClickCount = adminClickCount + 1;
      setAdminClickCount(newClickCount);
      if (newClickCount >= 5) {
          setLoginView('admin');
          setAdminClickCount(0); // Reset counter
      }
  }

  const handleLogin = async (userType: 'trader' | 'driver' | 'transport_company' | 'admin') => {
      setIsLoading(true);
      
      let result;
      let emailToLogin = '';
      let passwordToLogin = '';

      switch(userType) {
        case 'trader':
            emailToLogin = traderEmail;
            passwordToLogin = traderPassword;
            break;
        case 'driver':
             emailToLogin = driverEmail;
            passwordToLogin = driverPassword;
            break;
        case 'transport_company':
             emailToLogin = companyEmail;
            passwordToLogin = companyPassword;
            break;
        case 'admin':
             emailToLogin = adminEmail;
            passwordToLogin = adminPassword;
            break;
      }

      if (userType === 'admin') {
          result = await signInAdmin(emailToLogin, passwordToLogin);
      } else {
          result = await signInWithEmail(emailToLogin, passwordToLogin);
      }
      
      setIsLoading(false);

      if (result.success && result.identifier) { // Admin login
          onLogin('admin', result.identifier);
      } else if (result.success && result.userId) { // Regular user login
          onLogin(userType as 'trader' | 'driver' | 'transport_company', emailToLogin, false);
      } else {
          toast({
              title: 'Login Failed',
              description: result.error,
              variant: 'destructive',
          })
      }
  }
  
  const handleCompanyDriverLogin = async () => {
      setIsLoading(true);
      const result = await loginCompanyDriverAction(companyDriverName, companyDriverPassport);
      setIsLoading(false);

      if (result.success && result.identifier) {
          onLogin('driver', result.identifier, true);
      } else {
          toast({
              title: 'Login Failed',
              description: result.error || 'Please check your details and try again.',
              variant: 'destructive',
          })
      }
  }


  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
        {appLogoUrl ? (
          <img src={appLogoUrl} alt="SwiftHaul Logo" className="w-20 h-20 mb-4 object-contain" />
        ) : (
          <Truck className="w-20 h-20 text-primary mb-4" />
        )}
        <h1 className="text-4xl font-bold font-headline mb-2 text-foreground cursor-pointer" onClick={handleAdminSecretClick}>SwiftHaul</h1>
        <p className="text-lg text-muted-foreground mb-8">Your logistics partner, simplified.</p>

        <Card className="w-full max-w-md text-left">
            {loginView === 'admin' ? (
                <>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                             <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setLoginView('default')}>
                                <ArrowLeft className="h-4 w-4"/>
                            </Button>
                            <div>
                                <CardTitle>Admin Login</CardTitle>
                                <CardDescription>Enter your administrator credentials.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="admin-email">Admin Email</Label>
                                <Input id="admin-email" type="email" placeholder="admin@swifthaul.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="admin-password">Admin Password</Label>
                                <Input id="admin-password" type="password" placeholder="••••••••" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
                            </div>
                            <Button className="w-full bg-primary hover:bg-primary/90 mt-2" onClick={() => handleLogin('admin')} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Login as Admin
                            </Button>
                        </div>
                    </CardContent>
                </>
            ) : (
                 <>
                    <CardHeader>
                        <CardTitle>Get Started</CardTitle>
                        <CardDescription>Log in or sign up to continue.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AlertDialog>
                         <Tabs defaultValue="trader" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="trader"><Building className="mr-2 h-4 w-4" /> Trader</TabsTrigger>
                                <TabsTrigger value="driver"><User className="mr-2 h-4 w-4" /> Driver</TabsTrigger>
                                <TabsTrigger value="transport_company"><Building className="mr-2 h-4 w-4" /> Transport Co.</TabsTrigger>
                            </TabsList>
                            <TabsContent value="trader">
                              {showTraderSignup ? (
                                <TraderSignupForm 
                                    onSignup={() => {
                                        setShowTraderSignup(false);
                                        toast({ title: "Signup Submitted!", description: "Please wait for admin approval before logging in."});
                                    }}
                                    onSwitchToLogin={() => setShowTraderSignup(false)}
                                />
                              ) : (
                                <div className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="trader-email">Email</Label>
                                        <Input id="trader-email" type="email" placeholder="you@company.com" value={traderEmail} onChange={(e) => setTraderEmail(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="trader-password">Password</Label>
                                        <Input id="trader-password" type="password" placeholder="••••••••" value={traderPassword} onChange={e => setTraderPassword(e.target.value)} />
                                    </div>
                                     <div className="text-right">
                                        <AlertDialogTrigger asChild>
                                            <Button variant="link" size="sm" className="px-0" onClick={() => setForgotPasswordEmail(traderEmail)}>Forgot Password?</Button>
                                        </AlertDialogTrigger>
                                    </div>
                                    <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => handleLogin('trader')} disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Login as Trader
                                    </Button>
                                    <Button variant="outline" className="w-full" onClick={() => setShowTraderSignup(true)}>Sign Up</Button>
                                </div>
                              )}
                            </TabsContent>
                            <TabsContent value="driver">
                                 {showDriverSignup ? (
                                    <DriverSignupForm 
                                        onSignup={() => {
                                            setShowDriverSignup(false);
                                            toast({ title: "Signup Submitted!", description: "Please wait for admin approval before logging in."});
                                        }}
                                        onSwitchToLogin={() => setShowDriverSignup(false)}
                                    />
                                 ) : (
                                    <div className="space-y-4 pt-4">
                                        <div>
                                            <h3 className="font-semibold text-md pb-2">Independent Driver Login</h3>
                                            <div className="space-y-2">
                                                <Label htmlFor="driver-email">Email</Label>
                                                <Input id="driver-email" type="email" placeholder="driver@example.com" value={driverEmail} onChange={(e) => setDriverEmail(e.target.value)} />
                                            </div>
                                            <div className="space-y-2 mt-2">
                                                <Label htmlFor="driver-password">Password</Label>
                                                <Input id="driver-password" type="password" placeholder="••••••••" value={driverPassword} onChange={e => setDriverPassword(e.target.value)} />
                                            </div>
                                            <div className="text-right mt-2">
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="link" size="sm" className="px-0" onClick={() => setForgotPasswordEmail(driverEmail)}>Forgot Password?</Button>
                                                </AlertDialogTrigger>
                                            </div>
                                            <Button className="w-full bg-primary hover:bg-primary/90 mt-2" onClick={() => handleLogin('driver')} disabled={isLoading}>
                                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Login
                                            </Button>
                                            <Button variant="outline" className="w-full mt-2" onClick={() => setShowDriverSignup(true)}>Sign Up as Independent Driver</Button>
                                        </div>
                                        <Separator className="my-4" />
                                        <div>
                                            <h3 className="font-semibold text-md pb-2">Company Driver Login</h3>
                                            <div className="space-y-2">
                                                <Label htmlFor="company-driver-name">Full Name</Label>
                                                <Input id="company-driver-name" placeholder="John Doe" value={companyDriverName} onChange={(e) => setCompanyDriverName(e.target.value)} />
                                            </div>
                                            <div className="space-y-2 mt-2">
                                                <Label htmlFor="company-driver-passport">Passport No.</Label>
                                                <Input id="company-driver-passport" placeholder="AB12345" value={companyDriverPassport} onChange={(e) => setCompanyDriverPassport(e.target.value)} />
                                            </div>
                                            <Button className="w-full bg-secondary hover:bg-secondary/80 mt-4" onClick={handleCompanyDriverLogin} disabled={isLoading}>
                                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Login as Company Driver
                                            </Button>
                                        </div>
                                    </div>
                                 )}
                            </TabsContent>
                            <TabsContent value="transport_company">
                                {showTransportCompanySignup ? (
                                    <TransportCompanySignupForm 
                                        onSignup={() => {
                                            setShowTransportCompanySignup(false);
                                            toast({ title: "Signup Submitted!", description: "Please wait for admin approval before logging in."});
                                        }}
                                        onSwitchToLogin={() => setShowTransportCompanySignup(false)}
                                    />
                                ) : (
                                     <div className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="vendor-email">Email</Label>
                                            <Input id="vendor-email" type="email" placeholder="contact@company.com" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="vendor-password">Password</Label>
                                            <Input id="vendor-password" type="password" placeholder="••••••••" value={companyPassword} onChange={e => setCompanyPassword(e.target.value)} />
                                        </div>
                                         <div className="text-right">
                                            <AlertDialogTrigger asChild>
                                                <Button variant="link" size="sm" className="px-0" onClick={() => setForgotPasswordEmail(companyEmail)}>Forgot Password?</Button>
                                            </AlertDialogTrigger>
                                        </div>
                                        <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => handleLogin('transport_company')} disabled={isLoading}>
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Login as Transport Company
                                        </Button>
                                        <Button variant="outline" className="w-full" onClick={() => setShowTransportCompanySignup(true)}>Sign Up</Button>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                        <ForgotPasswordDialog email={forgotPasswordEmail} onEmailChange={setForgotPasswordEmail} />
                        </AlertDialog>
                    </CardContent>
                </>
            )}
        </Card>
    </div>
  );
};

export default WelcomeScreen;
