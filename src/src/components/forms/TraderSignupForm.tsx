
import { useState, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CreateTraderInput } from '@/schemas/trader';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { signUpTraderWithEmailAndPassword } from '@/app/auth/actions';

interface TraderSignupFormProps {
    onSignup: () => void;
    onSwitchToLogin: () => void;
}

const TraderSignupForm: FC<TraderSignupFormProps> = ({ onSignup, onSwitchToLogin }) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formData, setFormData] = useState<Omit<CreateTraderInput, 'status'>>({
        fullName: '',
        companyName: '',
        license: '',
        phone: '',
        email: '',
        address: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async () => {
        if (password !== confirmPassword) {
            toast({
                title: 'Passwords do not match',
                description: 'Please re-enter your password.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const traderPayload: CreateTraderInput = {
                ...formData,
                status: 'Pending',
            };

            const result = await signUpTraderWithEmailAndPassword(password, traderPayload);

            if(result.success) {
                toast({
                    title: 'Registration Submitted!',
                    description: "Your account is now pending approval from an admin.",
                });
                onSignup();
            } else {
                 toast({
                    title: 'Registration Failed',
                    description: result.error,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error(error);
             toast({
                title: 'An Unexpected Error Occurred',
                description: 'Please try again later.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-4 pt-4">
            <h3 className="font-semibold text-lg border-b pb-2">Trader / Consignee Signup</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" placeholder="e.g., Jane Smith" value={formData.fullName} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" placeholder="e.g., Global Imports" value={formData.companyName} onChange={handleInputChange} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="license">License/Passport No.</Label>
                    <Input id="license" placeholder="e.g., 123456" value={formData.license} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" placeholder="+971 50 987 6543" value={formData.phone} onChange={handleInputChange} />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@company.com" value={formData.email} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="e.g., Business Bay, Dubai" value={formData.address} onChange={handleInputChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={isSubmitting}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign Up
            </Button>
            <Button variant="link" className="w-full" onClick={onSwitchToLogin}>Already have an account? Login</Button>
        </div>
    );
};

export default TraderSignupForm;
