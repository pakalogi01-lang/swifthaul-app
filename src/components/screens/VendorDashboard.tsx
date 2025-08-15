import type { FC } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { List, PlusCircle } from 'lucide-react';

const VendorDashboard: FC = () => {
  return (
    <div className="p-4 space-y-6">
      <Card className="bg-primary text-primary-foreground">
        <CardHeader>
          <CardTitle>Welcome, Vendor!</CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Manage your services and view requests from drivers.
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
          <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Manage Your Services</span>
                <Button size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Service
                </Button>
              </CardTitle>
              <CardDescription>Add or edit the services you offer to drivers on the SwiftHaul network.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="border rounded-md p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">24/7 Tire Repair</h4>
                  <p className="text-sm text-muted-foreground">Location: Al Quoz Industrial Area 4</p>
                </div>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
          </CardContent>
      </Card>
       <Card>
          <CardHeader>
              <CardTitle>Service Requests</CardTitle>
              <CardDescription>View incoming requests from drivers.</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground p-8">
              <List className="mx-auto h-12 w-12" />
              <p className="mt-4">No active service requests.</p>
          </CardContent>
      </Card>
    </div>
  );
};

export default VendorDashboard;
