import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

export const VerificationBanner = () => {
    return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <Card className="text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                       <ShieldAlert className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>Verification Pending</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Your account is currently under review by our admin team.
                        <br />
                        You will have full access once your account is approved.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
