
"use client";

import type { FC } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createOrderAction } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { CreateOrderInput } from '@/ai/schemas/order';


interface PlaceOrderProps {
  onOrderPlaced: () => void;
  traderId?: string;
}

const PlaceOrder: FC<PlaceOrderProps> = ({ onOrderPlaced, traderId }) => {
    const { toast } = useToast();
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    
    const [orderData, setOrderData] = useState<Omit<CreateOrderInput, 'status' | 'traderId'>>({
        from: '',
        to: '',
        price: '',
        weight: '',
        material: '',
        vehicleType: '',
        trailerLength: '',
        trailerType: '',
        tollPaidBySender: false,
        waitingChargesPaidBySender: false,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setOrderData(prev => ({...prev, [id]: value}));
    }

    const handleSelectChange = (id: keyof typeof orderData) => (value: string) => {
         setOrderData(prev => ({...prev, [id]: value}));
    }
    
    const handleCheckboxChange = (id: keyof typeof orderData) => (checked: boolean | 'indeterminate') => {
        setOrderData(prev => ({...prev, [id]: !!checked}));
    }


    const handleSubmitOrder = async () => {
        if (!traderId) {
            toast({
                title: 'Authentication Error',
                description: 'Could not identify the trader. Please log in again.',
                variant: 'destructive',
            });
            return;
        }
        setIsPlacingOrder(true);
        try {
            const result = await createOrderAction({
                ...orderData,
                status: 'Pending Driver Assignment',
                traderId: traderId,
            });

            if(result.success) {
                toast({
                    title: 'Order Placed!',
                    description: `Your order #${result.id} has been sent to nearby drivers.`,
                });
                onOrderPlaced();
            } else {
                 toast({
                    title: 'Failed to Place Order',
                    description: result.error,
                    variant: 'destructive',
                });
            }
        } catch (error) {
             toast({
                title: 'An Unexpected Error Occurred',
                description: 'Please try again later.',
                variant: 'destructive',
            });
        } finally {
            setIsPlacingOrder(false);
        }
    }

  return (
    <div className="space-y-6 p-4">
        <Card>
            <CardHeader>
                <CardTitle>Route Details</CardTitle>
                <CardDescription>Enter pickup and drop-off locations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="from">Pickup Location</Label>
                    <Input id="from" placeholder="e.g., Jebel Ali Port" value={orderData.from} onChange={handleInputChange} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="to">Drop-off Location</Label>
                    <Input id="to" placeholder="e.g., Dubai Investment Park" value={orderData.to} onChange={handleInputChange} />
                </div>
            </CardContent>
        </Card>
        <Card>
             <CardHeader>
                <CardTitle>Order Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="price">Offered Price (AED)</Label>
                    <Input id="price" type="number" placeholder="e.g., 300" value={orderData.price} onChange={handleInputChange}/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="weight">Total Weight (Tons)</Label>
                    <Input id="weight" type="number" placeholder="e.g., 2.5" value={orderData.weight} onChange={handleInputChange} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="material">Description of Load / Material</Label>
                    <Textarea id="material" placeholder="e.g., Construction materials, furniture, etc." value={orderData.material} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="vehicleType">Required Vehicle</Label>
                    <Select value={orderData.vehicleType} onValueChange={handleSelectChange('vehicleType')}>
                        <SelectTrigger id="vehicleType">
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
                {orderData.vehicleType === 'heavy-vehicle' && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="trailerLength">Trailer Length (meters)</Label>
                            <Select value={orderData.trailerLength} onValueChange={handleSelectChange('trailerLength')}>
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
                            <Select value={orderData.trailerType} onValueChange={handleSelectChange('trailerType')}>
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
                <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="tollPaidBySender" checked={orderData.tollPaidBySender} onCheckedChange={handleCheckboxChange('tollPaidBySender')} />
                    <Label htmlFor="tollPaidBySender">Toll Paid by Sender</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="waitingChargesPaidBySender" checked={orderData.waitingChargesPaidBySender} onCheckedChange={handleCheckboxChange('waitingChargesPaidBySender')} />
                    <Label htmlFor="waitingChargesPaidBySender">Waiting Charges Paid by Sender</Label>
                </div>
            </CardContent>
        </Card>
        <Button size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSubmitOrder} disabled={isPlacingOrder}>
            {isPlacingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm and Place Order
        </Button>
    </div>
  );
};

export default PlaceOrder;
