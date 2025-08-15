
import { useState, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CreateDriverInput } from '@/schemas/driver';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { signUpDriverWithEmailAndPassword } from '@/app/auth/actions';
import { createDriverAction } from '@/app/actions';

interface DriverSignupFormProps {
    onSignup: (driverData: CreateDriverInput) => void;
    onSwitchToLogin: () => void;
    isSheet?: boolean;
    companyId?: string;
}

const DriverSignupForm: FC<DriverSignupFormProps> = ({ onSignup, onSwitchToLogin, isSheet = false, companyId }) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formData, setFormData] = useState<Omit<CreateDriverInput, 'status'>>({
        fullName: '',
        mobile: '',
        email: '',
        passport: '',
        vehicleReg: '',
        vehicleCat: '',
        trailerLength: '',
        trailerType: '',
        companyId: companyId,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (id: keyof typeof formData) => (value: string) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const driverPayload: CreateDriverInput = {
                ...formData,
                status: isSheet ? 'Active' : 'Pending', // Company drivers are active by default
            };

            // If it's a sheet, it's for adding a driver to a fleet, not signing up.
            if (isSheet) {
                 const result = await createDriverAction(driverPayload);
                 if (result.success) {
                    onSignup(driverPayload);
                 } else {
                     toast({
                        title: 'Failed to Add Driver',
                        description: result.error,
                        variant: 'destructive',
                    });
                 }
            } else {
                 if (password !== confirmPassword) {
                    toast({
                        title: 'Passwords do not match',
                        description: 'Please re-enter your password.',
                        variant: 'destructive',
                    });
                    setIsSubmitting(false);
                    return;
                }

                if (!formData.email) {
                     toast({
                        title: 'Email is required',
                        description: 'Independent drivers must sign up with an email.',
                        variant: 'destructive',
                    });
                    setIsSubmitting(false);
                    return;
                }

                const result = await signUpDriverWithEmailAndPassword(password, driverPayload);

                if(result.success) {
                    toast({
                        title: 'Registration Successful!',
                        description: "Your profile has been submitted for approval.",
                    });
                    onSignup(driverPayload);
                } else {
                     toast({
                        title: 'Registration Failed',
                        description: result.error,
                        variant: 'destructive',
                    });
                }
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
            <h3 className="font-semibold text-lg border-b pb-2">Driver Details</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" placeholder="e.g., John Doe" value={formData.fullName} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input id="mobile" placeholder="+971 50 123 4567" value={formData.mobile} onChange={handleInputChange} />
                </div>
                {!isSheet && (
                     <div className="space-y-2 col-span-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="driver@example.com" value={formData.email} onChange={handleInputChange} />
                    </div>
                )}
                <div className="space-y-2 col-span-2">
                    <Label htmlFor="passport">Passport No.</Label>
                    <Input id="passport" placeholder="e.g., AB12345" value={formData.passport} onChange={handleInputChange} />
                </div>
            </div>
            
            {!isSheet && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                </div>
            )}

            <h3 className="font-semibold text-lg border-b pb-2 pt-4">Vehicle Details</h3>
            <div className="space-y-2">
                <Label htmlFor="vehicleReg">Vehicle Registration No.</Label>
                <Input id="vehicleReg" placeholder="e.g., A 12345" value={formData.vehicleReg} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="vehicleCat">Available Vehicle Category</Label>
                <Select onValueChange={handleSelectChange('vehicleCat')} value={formData.vehicleCat}>
                    <SelectTrigger id="vehicleCat">
                        <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1-tonn">1 Tonn</SelectItem>
                        <SelectItem value="3-tonn">3 Tonns</SelectItem>
                        <SelectItem value="7-tonn">7 Tonns</SelectItem>
                        <SelectItem value="10-tonn">10 Tonns</SelectItem>
                        <SelectItem value="heavy-vehicle">Heavy Vehicle</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {formData.vehicleCat === 'heavy-vehicle' && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="trailerLength">Trailer Length (meters)</Label>
                        <Select onValueChange={handleSelectChange('trailerLength')} value={formData.trailerLength}>
                            <SelectTrigger id="trailerLength">
                                <SelectValue placeholder="Select trailer length" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="12">12</SelectItem>
                                <SelectItem value="13.5">13.5</SelectItem>
                                <SelectItem value="15">15</SelectItem>
                                <SelectItem value="18">18</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="trailerType">Trailer Type</Label>
                        <Select onValueChange={handleSelectChange('trailerType')} value={formData.trailerType}>
                            <SelectTrigger id="trailerType">
                                <SelectValue placeholder="Select trailer type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="box">BOX (SANDOOK)</SelectItem>
                                <SelectItem value="curtain">CURTIN SIDE (SITARA)</SelectItem>
                                <SelectItem value="flatbed">FLAT BED</SelectItem>
                                <SelectItem value="lowbed">LOW BED</SelectItem>
                                <SelectItem value="refrigerator">REFRIGERATOR</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </>
            )}

            <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={isSubmitting}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSheet ? 'Add Driver' : 'Sign Up as Driver'}
            </Button>
            {!isSheet && (
                <Button variant="link" className="w-full" onClick={onSwitchToLogin}>Already have an account? Login</Button>
            )}
        </div>
    )
};

export default DriverSignupForm;
