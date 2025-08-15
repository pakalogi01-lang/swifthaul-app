
import { useState, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { signUpTransportCompanyWithEmailAndPassword } from '@/app/auth/actions';
import type { CreateTransportCompanyInput } from '@/schemas/transportCompany';

interface TransportCompanySignupFormProps {
    onSignup: () => void;
    onSwitchToLogin: () => void;
}

const TransportCompanySignupForm: FC<TransportCompanySignupFormProps> = ({ onSignup, onSwitchToLogin }) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formData, setFormData] = useState<Omit<CreateTransportCompanyInput, 'status'>>({
        companyName: '',
        trnNumber: '',
        email: '',
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
            const companyPayload: CreateTransportCompanyInput = {
                ...formData,
                status: 'Pending',
            };

            const result = await signUpTransportCompanyWithEmailAndPassword(password, companyPayload);

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
    };

    return (
        <div className="space-y-4 pt-4">
            <h3 className="font-semibold text-lg border-b pb-2">Transport Company Signup</h3>
            <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" placeholder="e.g., Reliable Auto Repairs" value={formData.companyName} onChange={handleInputChange} />
            </div>
                <div className="space-y-2">
                <Label htmlFor="trnNumber">TRN Number</Label>
                <Input id="trnNumber" placeholder="e.g., 100234567890" value={formData.trnNumber} onChange={handleInputChange}/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="contact@company.com" value={formData.email} onChange={handleInputChange}/>
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

export default TransportCompanySignupForm;
