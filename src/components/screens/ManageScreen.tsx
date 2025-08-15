
import { FC, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Trash2, Eye, Users, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog"
import { deleteUserAction, warnUserAction } from '@/app/actions';
import { Input } from '../ui/input';

interface UserListProps {
    users: any[];
    type: string;
    onWarn: (id: string) => void;
    onDelete: (id: string) => void;
    onView: (user: any) => void;
}

const UserList:FC<UserListProps> = ({ users, type, onWarn, onDelete, onView }) => (
    <div className="space-y-3">
        {users.length === 0 ? <p className="text-center text-muted-foreground pt-8">No users found for this search.</p> : users.map(user => {
            const userName = user.name || user.fullName || user.companyName || 'Unnamed User';
            return (
            <div key={user.id} className="border p-3 rounded-lg flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={user.photoURL || `https://i.pravatar.cc/150?u=${user.email || userName}`} />
                        <AvatarFallback>{userName.substring(0,2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p className="font-semibold">{userName}</p>
                         <Badge 
                            variant={user.status === 'Active' ? 'secondary' : user.status === 'Warned' ? 'destructive' : 'default'} 
                            className={user.status === 'Active' ? 'text-green-500' : user.status === 'Pending' ? 'bg-yellow-500' : ''}
                        >
                            {user.status}
                        </Badge>
                    </div>
                </div>
                 <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onView(user)}><Eye className="h-4 w-4" /></Button>
                    {user.status !== 'Pending' && (
                        <Button variant="ghost" size="icon" onClick={() => onWarn(user.id)}><ShieldAlert className="h-4 w-4 text-orange-500" /></Button>
                    )}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the user account
                                for {userName} and remove their data from our servers.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(user.id)} className="bg-destructive hover:bg-destructive/90">Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        )})}
    </div>
);

interface ManageScreenProps {
    traders: any[];
    drivers: any[];
    companies: any[];
    onViewProfile: (user: any, type: string) => void;
}

const ManageScreen: FC<ManageScreenProps> = ({ traders, drivers, companies, onViewProfile }) => {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTraders = useMemo(() => 
        traders.filter(t => 
            t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
            t.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.email.toLowerCase().includes(searchQuery.toLowerCase())
        ), [traders, searchQuery]);

    const filteredDrivers = useMemo(() => 
        drivers.filter(d => 
            d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (d.email && d.email.toLowerCase().includes(searchQuery.toLowerCase()))
        ), [drivers, searchQuery]);

    const filteredCompanies = useMemo(() => 
        companies.filter(c => 
            c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email.toLowerCase().includes(searchQuery.toLowerCase())
        ), [companies, searchQuery]);

    const handleWarn = (userType: 'trader' | 'driver' | 'transport_company') => async (id: string) => {
        const result = await warnUserAction(id, userType);
        if (result.success) {
            toast({
                title: 'User Warned',
                description: `The user has been issued a warning and their status has been updated.`,
            });
        } else {
             toast({
                title: 'Warning Failed',
                description: result.error,
                variant: 'destructive',
            });
        }
    };

    const handleDelete = (userType: 'trader' | 'driver' | 'transport_company') => async (id: string) => {
        const result = await deleteUserAction(id, userType);
        if (result.success) {
            toast({
                title: 'User Deleted',
                description: `The user has been permanently deleted.`,
            });
        } else {
            toast({
                title: 'Deletion Failed',
                description: result.error,
                variant: 'destructive',
            });
        }
    };

    const handleView = (user: any, type: string) => {
        onViewProfile(user, type);
    }

  return (
    <div className="p-4 space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Traders</CardTitle>
                    <CardDescription>{traders.length} registered</CardDescription>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Drivers</CardTitle>
                    <CardDescription>{drivers.length} registered</CardDescription>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Companies</CardTitle>
                    <CardDescription>{companies.length} registered</CardDescription>
                </CardHeader>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>User Directory</CardTitle>
                <CardDescription>Search, view, and manage all users on the platform.</CardDescription>
                 <div className="relative pt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by name, company, or email..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="traders" className="w-full">
                    <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="traders">Traders ({filteredTraders.length})</TabsTrigger>
                        <TabsTrigger value="drivers">Drivers ({filteredDrivers.length})</TabsTrigger>
                        <TabsTrigger value="companies">Companies ({filteredCompanies.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="traders" className="mt-4">
                        <UserList users={filteredTraders} type="Trader" onWarn={handleWarn('trader')} onDelete={handleDelete('trader')} onView={(user) => handleView(user, 'trader')} />
                    </TabsContent>
                    <TabsContent value="drivers" className="mt-4">
                        <UserList users={filteredDrivers} type="Driver" onWarn={handleWarn('driver')} onDelete={handleDelete('driver')} onView={(user) => handleView(user, 'driver')} />
                    </TabsContent>
                    <TabsContent value="companies" className="mt-4">
                        <UserList users={filteredCompanies} type="Company" onWarn={handleWarn('transport_company')} onDelete={handleDelete('transport_company')} onView={(user) => handleView(user, 'transport_company')} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </div>
  );
};

export default ManageScreen;
