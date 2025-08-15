
import { FC, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { uploadAppLogoAction, updateAppLogoUrlAction } from '@/app/actions';
import { Loader2, UploadCloud } from 'lucide-react';

interface SettingsScreenProps {
    appLogoUrl: string | null;
}

const SettingsScreen: FC<SettingsScreenProps> = ({ appLogoUrl }) => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

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
            
            const uploadResult = await uploadAppLogoAction(formData);
            if (!uploadResult.success || !uploadResult.url) {
                throw new Error(uploadResult.error || 'Failed to upload app logo.');
            }

            const updateResult = await updateAppLogoUrlAction(uploadResult.url);
            if (!updateResult.success) {
                throw new Error(updateResult.error || 'Failed to update app logo URL.');
            }

            toast({ title: 'App logo updated successfully!' });

        } catch (error) {
            console.error("Error during logo upload process:", error);
            toast({ title: 'Upload Failed', description: (error as Error).message, variant: 'destructive' });
        } finally {
            setIsUploading(false);
            // Reset file input
            if(fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Branding</CardTitle>
                    <CardDescription>Customize the look and feel of the application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="text-lg font-medium mb-2">App Logo</h3>
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-secondary rounded-md flex items-center justify-center">
                                {appLogoUrl ? (
                                    <img src={appLogoUrl} alt="Current App Logo" className="w-full h-full object-contain rounded-md" />
                                ) : (
                                    <p className="text-xs text-muted-foreground">No Logo</p>
                                )}
                            </div>
                             <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/png, image/jpeg, image/svg+xml"
                                disabled={isUploading}
                            />
                            <Button onClick={handleUploadClick} disabled={isUploading}>
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                                Upload New Logo
                            </Button>
                        </div>
                         <p className="text-xs text-muted-foreground mt-2">Recommended: Square image (e.g., 256x256), PNG or SVG format.</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Theme</CardTitle>
                    <CardDescription>Adjust the application's color scheme (coming soon).</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Theme customization options will be available here in a future update.</p>
                </CardContent>
            </Card>
        </div>
    );
}

export default SettingsScreen;
