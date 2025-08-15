
import React, { FC, useState, useRef, useEffect, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileUp, Building, UploadCloud, Loader2, Camera, CheckCircle, Edit, X, FileBadge, Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { uploadProfilePictureAction, updateUserProfilePictureAction, uploadDocumentAction, updateTraderProfileAction, updateDriverProfileAction, updateTransportCompanyProfileAction } from '@/app/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { UpdateTraderProfileInput } from '@/schemas/trader';
import type { UpdateDriverProfileInput } from '@/schemas/driver';
import type { UpdateTransportCompanyProfileInput } from '@/schemas/transportCompany';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"


interface ProfileScreenProps {
  userType: 'trader' | 'driver' | 'transport_company' | 'admin' | null;
  profileData: any;
  isViewingSelf: boolean;
}

const ViewDocumentsDialog: FC<{ user: any, userType: 'driver' | 'trader' | 'transport_company' }> = ({ user, userType }) => {
    let documents: {label: string, url?: string}[] = [];

    if (userType === 'driver') {
        documents = [
            { label: 'Passport Copy', url: user.passportCopyUrl },
            { label: 'ID Copy', url: user.idCopyUrl },
            { label: 'License (Front)', url: user.licenseFrontUrl },
            { label: 'License (Back)', url: user.licenseBackUrl },
            { label: 'Mulkia (Front)', url: user.mulkiaFrontUrl },
            { label: 'Mulkia (Back)', url: user.mulkiaBackUrl },
        ];
    } else {
        // You can add document types for other roles here if needed in the future
        documents = [];
    }

    const availableDocuments = documents.filter(doc => doc.url);

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Documents: {user.fullName || user.companyName}</DialogTitle>
                <DialogDescription>
                    Review the uploaded documents for this user.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                {availableDocuments.length > 0 ? (
                    availableDocuments.map(doc => (
                        <a 
                            key={doc.label}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 border rounded-md hover:bg-secondary transition-colors"
                        >
                            <span className="font-medium">{doc.label}</span>
                            <Eye className="h-5 w-5 text-muted-foreground" />
                        </a>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground">No documents have been uploaded by this user yet.</p>
                )}
            </div>
        </DialogContent>
    );
}


const ReadOnlyField: FC<{label: string, value: string | undefined}> = ({ label, value }) => (
    <div className="space-y-2">
        <Label>{label}</Label>
        <Input readOnly value={value || 'N/A'} className="bg-secondary border-secondary" />
    </div>
);

const DocumentUpload: FC<{
    label: string;
    userId: string;
    documentType: string;
    onUploadSuccess: (documentType: string, url: string) => void;
    initialUrl?: string;
}> = ({ label, userId, documentType, onUploadSuccess, initialUrl }) => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploaded, setIsUploaded] = useState(!!initialUrl);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', userId);

            const uploadResult = await uploadDocumentAction(formData);
            
            if (uploadResult.success && uploadResult.url) {
                onUploadSuccess(documentType, uploadResult.url);
                toast({ title: 'Document Uploaded!', description: `${label} has been successfully uploaded.` });
                setIsUploaded(true);
            } else {
                throw new Error(uploadResult.error);
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'Upload Failed', description: (error as Error).message, variant: 'destructive' });
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }

    return (
        <div className="p-4 border-2 border-dashed rounded-lg text-center">
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, application/pdf"
                disabled={isUploading || isUploaded}
            />
            {isUploaded ? <CheckCircle className="mx-auto h-8 w-8 text-green-500" /> : <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />}
            <p className="mt-2 text-sm text-muted-foreground">{label}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleUploadClick} disabled={isUploading || isUploaded}>
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isUploaded ? 'Uploaded' : 'Upload File'}
            </Button>
        </div>
    );
};

const ProfileCard: FC<{
    profile: any;
    isViewingSelf: boolean;
    loggedInUserType: 'trader' | 'driver' | 'transport_company' | 'admin' | null;
    viewedUserType: 'trader' | 'driver' | 'transport_company';
    children: (props: {
        isEditing: boolean;
        formData: any;
        setFormData: React.Dispatch<any>;
        handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        handleSelectChange: (id: string) => (value: string) => void;
    }) => ReactNode;
    title: string;
    description: string;
    onSave: (data: any) => Promise<{success: boolean, error?: string}>;
}> = ({ profile, isViewingSelf, loggedInUserType, viewedUserType, children, title, description, onSave }) => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState(profile);

    useEffect(() => {
        setFormData(profile);
    }, [profile]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (id: string) => (value: string) => {
        setFormData((prev: any) => ({ ...prev, [id]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const result = await onSave(formData);
        setIsSaving(false);

        if(result.success) {
            toast({ title: "Profile updated successfully!" });
            setIsEditing(false);
        } else {
            toast({ title: "Update Failed", description: result.error, variant: 'destructive' });
        }
    }

    const canUpload = isViewingSelf;

    const handleAvatarClick = () => {
        if (canUpload) {
            fileInputRef.current?.click();
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !viewedUserType) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', profile.id);

            const uploadResult = await uploadProfilePictureAction(formData);
            
            if (uploadResult.success && uploadResult.url) {
                const updateResult = await updateUserProfilePictureAction(profile.id, viewedUserType, uploadResult.url);
                if (updateResult.success) {
                    toast({ title: 'Profile picture updated successfully!' });
                } else {
                    throw new Error(updateResult.error);
                }
            } else {
                throw new Error(uploadResult.error || 'Upload failed');
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'Upload Failed', description: (error as Error).message, variant: 'destructive' });
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <Dialog>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                             <CardTitle>{isEditing ? "Edit Profile" : title}</CardTitle>
                             <CardDescription>{description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                             {loggedInUserType === 'admin' && viewedUserType === 'driver' && (
                                <DialogTrigger asChild>
                                    <Button variant="secondary" size="icon">
                                        <FileBadge className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                            )}
                            {isViewingSelf && (
                                isEditing ? (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="icon" onClick={() => setIsEditing(false)} disabled={isSaving}><X className="h-4 w-4" /></Button>
                                        <Button size="icon" onClick={handleSave} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                ) : (
                                    <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                )
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-2 space-y-4">
                     <div className="relative w-24 h-24 mx-auto">
                        <Avatar className="w-24 h-24 text-4xl">
                            <AvatarImage src={formData.photoURL || `https://i.pravatar.cc/150?u=${formData.email || formData.fullName}`} alt={title} />
                            <AvatarFallback>{formData.companyName?.[0] || formData.fullName?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        {canUpload && (
                            <>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/png, image/jpeg"
                                    disabled={isUploading}
                                />
                                <Button
                                    size="icon"
                                    className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                                    onClick={handleAvatarClick}
                                    disabled={isUploading}
                                >
                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                </Button>
                            </>
                        )}
                    </div>
                    {children({ isEditing, formData, setFormData, handleInputChange, handleSelectChange })}
                </CardContent>
            </Card>
            <ViewDocumentsDialog user={profile} userType={viewedUserType} />
        </Dialog>
    );
}

const TraderProfile: FC<{profile: any, isViewingSelf: boolean, loggedInUserType: 'trader' | 'admin' | null}> = ({ profile, isViewingSelf, loggedInUserType }) => {
    if (!profile) return <p>Loading trader profile...</p>;

    const handleSave = (data: any) => {
        const { fullName, companyName, license, phone, address } = data;
        return updateTraderProfileAction(profile.id, { fullName, companyName, license, phone, address });
    }

    return (
        <ProfileCard 
            profile={profile} 
            isViewingSelf={isViewingSelf}
            loggedInUserType={loggedInUserType}
            viewedUserType='trader'
            title={profile.companyName}
            description="Trader Account"
            onSave={handleSave}
        >
            {(props) => (
                <>
                    <TraderProfileFields {...props} />
                    {isViewingSelf && (
                        <div className="space-y-4 pt-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Upload Documents</h3>
                            <Alert>
                                <AlertTitle>Complete Your Profile</AlertTitle>
                                <AlertDescription>
                                    Please upload the required documents for full account verification.
                                </AlertDescription>
                            </Alert>
                            <DocumentUpload 
                                label="Upload Visiting Card Picture" 
                                userId={profile.id} 
                                documentType="visitingCard"
                                onUploadSuccess={() => {}} 
                            />
                        </div>
                    )}
                </>
            )}
        </ProfileCard>
    );
};

const TraderProfileFields: FC<{isEditing?: boolean, formData?: any, handleInputChange?: any}> = ({ isEditing, formData, handleInputChange }) => (
    <>
        {isEditing ? (
            <>
                <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" value={formData.fullName} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" value={formData.companyName} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="license">License/Passport No.</Label>
                    <Input id="license" value={formData.license} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" value={formData.phone} onChange={handleInputChange} />
                </div>
                <ReadOnlyField label="Email" value={formData.email} />
                 <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" value={formData.address} onChange={handleInputChange} />
                </div>
            </>
        ) : (
            <>
                <ReadOnlyField label="Full Name" value={formData.fullName} />
                <ReadOnlyField label="Company Name" value={formData.companyName} />
                <ReadOnlyField label="License/Passport No." value={formData.license} />
                <ReadOnlyField label="Phone Number" value={formData.phone} />
                <ReadOnlyField label="Email" value={formData.email} />
                <ReadOnlyField label="Address" value={formData.address} />
            </>
        )}
    </>
)


const DriverProfile: FC<{profile: any, isViewingSelf: boolean, loggedInUserType: 'driver' | 'admin' | null}> = ({ profile, isViewingSelf, loggedInUserType }) => {
    if (!profile) return <p>Loading driver profile...</p>;

    const handleSave = (data: any) => {
        const { fullName, mobile, passport, vehicleReg, vehicleCat, trailerLength, trailerType, ...docUrls } = data;
        return updateDriverProfileAction(profile.id, { fullName, mobile, passport, vehicleReg, vehicleCat, trailerLength, trailerType, ...docUrls });
    }

    const handleDocumentUploadSuccess = (documentType: string, url: string) => {
        updateDriverProfileAction(profile.id, { [documentType]: url });
    }

    return (
     <ProfileCard
        profile={profile}
        isViewingSelf={isViewingSelf}
        loggedInUserType={loggedInUserType}
        viewedUserType='driver'
        title={profile.fullName}
        description="Driver Account"
        onSave={handleSave}
     >
        {({ setFormData, ...props }) => (
            <>
                <DriverProfileFields {...props} />
                {isViewingSelf && (
                    <div className="space-y-4 pt-4">
                        <h3 className="font-semibold text-lg border-b pb-2">Upload Documents</h3>
                        <Alert>
                            <AlertTitle>Complete Your Profile</AlertTitle>
                            <AlertDescription>
                            Please upload the required documents for full account verification.
                            </AlertDescription>
                        </Alert>
                        <div className="grid grid-cols-2 gap-4">
                            <DocumentUpload label="Passport Copy" userId={profile.id} documentType="passportCopyUrl" onUploadSuccess={handleDocumentUploadSuccess} initialUrl={props.formData.passportCopyUrl} />
                            <DocumentUpload label="ID Copy" userId={profile.id} documentType="idCopyUrl" onUploadSuccess={handleDocumentUploadSuccess} initialUrl={props.formData.idCopyUrl} />
                            <DocumentUpload label="License (Front)" userId={profile.id} documentType="licenseFrontUrl" onUploadSuccess={handleDocumentUploadSuccess} initialUrl={props.formData.licenseFrontUrl} />
                            <DocumentUpload label="License (Back)" userId={profile.id} documentType="licenseBackUrl" onUploadSuccess={handleDocumentUploadSuccess} initialUrl={props.formData.licenseBackUrl} />
                            <DocumentUpload label="Mulkia (Front)" userId={profile.id} documentType="mulkiaFrontUrl" onUploadSuccess={handleDocumentUploadSuccess} initialUrl={props.formData.mulkiaFrontUrl} />
                            <DocumentUpload label="Mulkia (Back)" userId={profile.id} documentType="mulkiaBackUrl" onUploadSuccess={handleDocumentUploadSuccess} initialUrl={props.formData.mulkiaBackUrl} />
                        </div>
                    </div>
                )}
            </>
        )}
    </ProfileCard>
    );
};

const DriverProfileFields: FC<{isEditing?: boolean, formData?: any, handleInputChange?: any, handleSelectChange?: any}> = ({ isEditing, formData, handleInputChange, handleSelectChange }) => (
    <>
        <h3 className="font-semibold text-lg border-b pb-2">Personal Details</h3>
        {isEditing ? (
            <>
                 <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" value={formData.fullName} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input id="mobile" value={formData.mobile} onChange={handleInputChange} />
                </div>
                 {formData.email && <ReadOnlyField label="Email" value={formData.email} />}
                <div className="space-y-2">
                    <Label htmlFor="passport">Passport No.</Label>
                    <Input id="passport" value={formData.passport} onChange={handleInputChange} />
                </div>
            </>
        ) : (
            <>
                <ReadOnlyField label="Full Name" value={formData.fullName} />
                <ReadOnlyField label="Mobile Number" value={formData.mobile} />
                {formData.email && <ReadOnlyField label="Email" value={formData.email} />}
                <ReadOnlyField label="Passport No." value={formData.passport} />
            </>
        )}
        
         <h3 className="font-semibold text-lg border-b pb-2 pt-4">Vehicle Details</h3>
         {isEditing ? (
            <>
                 <div className="space-y-2">
                    <Label htmlFor="vehicleReg">Vehicle Registration No.</Label>
                    <Input id="vehicleReg" value={formData.vehicleReg} onChange={handleInputChange} />
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
            </>
         ) : (
            <>
                <ReadOnlyField label="Vehicle Registration No." value={formData.vehicleReg} />
                <div className="space-y-2">
                    <Label>Available Vehicle Category</Label>
                    <Input readOnly value={formData.vehicleCat?.replace(/-/g,' ').replace(/(^\w{1})|(\s+\w{1})/g, (letter: string) => letter.toUpperCase())} className="bg-secondary border-secondary" />
                </div>
                {formData.vehicleCat === 'heavy-vehicle' && (
                    <div className="grid grid-cols-2 gap-4">
                        <ReadOnlyField label="Trailer Length" value={`${formData.trailerLength}m`} />
                        <ReadOnlyField label="Trailer Type" value={formData.trailerType?.charAt(0).toUpperCase() + formData.trailerType?.slice(1)} />
                    </div>
                )}
            </>
         )}
    </>
)

const TransportCompanyProfile: FC<{profile: any, isViewingSelf: boolean, loggedInUserType: 'transport_company' | 'admin' | null}> = ({ profile, isViewingSelf, loggedInUserType }) => {
     if (!profile) return <p>Loading company profile...</p>;

    const handleSave = (data: any) => {
        const { companyName, trnNumber } = data;
        return updateTransportCompanyProfileAction(profile.id, { companyName, trnNumber });
    }

    return (
        <ProfileCard
            profile={profile}
            isViewingSelf={isViewingSelf}
            loggedInUserType={loggedInUserType}
            viewedUserType='transport_company'
            title={profile.companyName}
            description="Transport Company Account"
            onSave={handleSave}
        >
            {(props) => <TransportCompanyProfileFields {...props} />}
        </ProfileCard>
    )
};

const TransportCompanyProfileFields: FC<{isEditing?: boolean, formData?: any, handleInputChange?: any}> = ({ isEditing, formData, handleInputChange }) => (
    <>
        {isEditing ? (
            <>
                <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" value={formData.companyName} onChange={handleInputChange} />
                </div>
                <ReadOnlyField label="Email" value={formData.email} />
                <div className="space-y-2">
                    <Label htmlFor="trnNumber">TRN Number</Label>
                    <Input id="trnNumber" value={formData.trnNumber} onChange={handleInputChange} />
                </div>
            </>
        ) : (
            <>
                <ReadOnlyField label="Company Name" value={formData.companyName} />
                <ReadOnlyField label="Email" value={formData.email} />
                <ReadOnlyField label="TRN Number" value={formData.trnNumber} />
            </>
        )}
    </>
)


const ProfileScreen: FC<ProfileScreenProps> = ({ userType, profileData, isViewingSelf }) => {
  const renderProfile = () => {
    if (!profileData) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Loading profile...</p>
            </div>
        );
    }
    
    // Determine the type of the logged-in user and the user being viewed
    const loggedInUserType = userType;
    const viewedUserType = profileData.trnNumber ? 'transport_company' : (profileData.license ? 'trader' : 'driver');

    switch (viewedUserType) {
      case 'trader':
        return <TraderProfile profile={profileData} isViewingSelf={isViewingSelf} loggedInUserType={loggedInUserType as 'trader' | 'admin'}/>;
      case 'driver':
        return <DriverProfile profile={profileData} isViewingSelf={isViewingSelf} loggedInUserType={loggedInUserType as 'driver' | 'admin'} />;
      case 'transport_company':
        return <TransportCompanyProfile profile={profileData} isViewingSelf={isViewingSelf} loggedInUserType={loggedInUserType as 'transport_company' | 'admin'} />;
      default:
        return <p>No profile found or user type is invalid. Please log in again.</p>;
    }
  };

  return <div className="p-4 space-y-6">{renderProfile()}</div>;
};

export default ProfileScreen;
