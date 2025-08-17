"use server";

import type { CreateOrderInput, UpdateOrderStatusInput, CreatePaymentRequestInput, RecordPayoutInput } from "@/ai/schemas/order";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, query, deleteDoc, where, getDoc, runTransaction, arrayUnion, setDoc, writeBatch, GeoPoint } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { CreateDriverInput, UpdateDriverProfileInput, UpdateDriverStatusInput } from "@/schemas/driver";
import type { CreateTraderInput, UpdateTraderProfileInput, UpdateTraderStatusInput } from "@/schemas/trader";
import type { CreateTransportCompanyInput, UpdateTransportCompanyProfileInput, UpdateTransportCompanyStatusInput } from "@/schemas/transportCompany";
import { v4 as uuidv4 } from 'uuid';

export async function createOrderAction(input: CreateOrderInput) {
  try {
    const docRef = await addDoc(collection(db, "orders"), {
      ...input,
      status: 'Pending Driver Assignment',
      paymentStatus: 'Pending',
      amountPaidByTrader: 0,
      amountPaidToDriver: 0,
      paymentHistory: [],
      paymentRequests: [],
      hiddenFor: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    // After creating order, notify relevant drivers
    await notifyRelevantDriversAction(input.vehicleType, docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating order:", error);
    return { success: false, error: "Failed to create order in database." };
  }
}

export async function createDriverAction(input: CreateDriverInput) {
  try {
    const docRef = await addDoc(collection(db, "drivers"), {
      ...input,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating driver:", error);
    return { success: false, error: "Failed to create driver in database." };
  }
}

export async function createTraderAction(input: CreateTraderInput) {
  try {
    const docRef = await addDoc(collection(db, "traders"), {
      ...input,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating trader:", error);
    return { success: false, error: "Failed to create trader in database." };
  }
}

export async function createTransportCompanyAction(input: CreateTransportCompanyInput) {
  try {
    const docRef = await addDoc(collection(db, "transportCompanies"), {
      ...input,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating transport company:", error);
    return { success: false, error: "Failed to create transport company in database." };
  }
}

export async function getOrdersAction() {
    try {
        const q = query(collection(db, "orders"));
        const querySnapshot = await getDocs(q);
        const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { success: true, data: orders };
    } catch (error) {
        console.error("Error getting orders:", error);
        return { success: false, error: "Failed to retrieve orders." };
    }
}

export async function updateOrderStatusAction(input: UpdateOrderStatusInput) {
    try {
        const orderRef = doc(db, "orders", input.orderId);
        await updateDoc(orderRef, {
            status: input.status,
            updatedAt: serverTimestamp(),
            ...(input.driverId && { driverId: input.driverId }),
        });

        // Also update the driver's status
        if (input.driverId && (input.status === 'Pending Pickup' || input.status === 'In Transit')) {
            const driverStatus = input.status === 'In Transit' ? 'On-Trip' : 'Busy';
             await updateDriverStatusAction({ driverId: input.driverId, status: driverStatus });
        } else if (input.driverId && (input.status === 'Delivered' || input.status === 'Cancelled')) {
             await updateDriverStatusAction({ driverId: input.driverId, status: 'Available' });
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating order status:", error);
        return { success: false, error: "Failed to update order status." };
    }
}

async function sendNotification(collectionName: string, docId: string, title: string, description: string, data?: object) {
    try {
        const notificationsCol = collection(db, `${collectionName}/${docId}/notifications`);
        await addDoc(notificationsCol, {
            title,
            description,
            isRead: false,
            createdAt: serverTimestamp(),
            ...(data && { data }),
        });
    } catch (error) {
        console.error(`Failed to send notification to ${collectionName}/${docId}:`, error);
    }
}

export async function notifyRelevantDriversAction(vehicleType: string, orderId: string) {
    try {
        // Fetch order details for heavy vehicle matching
        const orderDoc = await getDoc(doc(db, "orders", orderId));
        if (!orderDoc.exists()) {
            console.error("Notification failed: Order not found.");
            return { success: false, error: "Order not found." };
        }
        const orderData = orderDoc.data();

        // 1. Notify Individual Drivers
        const driverQueryConstraints = [
            where("status", "==", "Available"),
            where("vehicleCat", "==", vehicleType)
        ];

        if (vehicleType === 'heavy-vehicle') {
            if (orderData.trailerLength) driverQueryConstraints.push(where("trailerLength", "==", orderData.trailerLength));
            if (orderData.trailerType) driverQueryConstraints.push(where("trailerType", "==", orderData.trailerType));
        }
        
        const individualDriversQuery = query(collection(db, "drivers"), ...driverQueryConstraints);
        const driverSnapshot = await getDocs(individualDriversQuery);

        const title = "New Job Available!";
        const description = `A new job matching your vehicle type (${vehicleType}) is available. Order #${orderId.substring(0, 6)}.`;

        const driverNotifications = driverSnapshot.docs.map(driverDoc => 
            sendNotification('drivers', driverDoc.id, title, description, { orderId })
        );
        
        // 2. Notify Transport Companies if they have a matching driver
        const companiesQuery = query(collection(db, "transportCompanies"), where("status", "==", "Available"));
        const companySnapshot = await getDocs(companiesQuery);

        const companyNotificationPromises = companySnapshot.docs.map(async (companyDoc) => {
            const companyId = companyDoc.id;
            
            // Check if this company has any driver that can fulfill this job
            const fleetQueryConstraints = [
                where("companyId", "==", companyId),
                where("vehicleCat", "==", vehicleType),
            ];

            if (vehicleType === 'heavy-vehicle') {
                 if (orderData.trailerLength) fleetQueryConstraints.push(where("trailerLength", "==", orderData.trailerLength));
                 if (orderData.trailerType) fleetQueryConstraints.push(where("trailerType", "==", orderData.trailerType));
            }
            
            const companyFleetQuery = query(collection(db, "drivers"), ...fleetQueryConstraints);
            const fleetSnapshot = await getDocs(companyFleetQuery);
            
            // If at least one driver in their fleet matches, send notification to the company
            if (!fleetSnapshot.empty) {
                return sendNotification('transportCompanies', companyId, title, description, { orderId });
            }
            return Promise.resolve(); // No matching driver, no notification
        });

        const notifiedCompanies = (await Promise.all(companyNotificationPromises)).filter(p => p !== undefined);

        await Promise.all([...driverNotifications]);
        
        return { success: true, notifiedCount: driverSnapshot.size + notifiedCompanies.length };

    } catch (error) {
        console.error("Error notifying relevant drivers/companies:", error);
        return { success: false, error: "Failed to notify relevant drivers/companies." };
    }
}


export async function notifyTraderForPaymentAction(orderId: string, traderId: string, message: string) {
    if (!orderId || !traderId) {
        return { success: false, error: "Missing order ID or trader ID." };
    }
    try {
        const title = "Payment Request";
        await sendNotification('traders', traderId, title, message, { orderId, view: 'trader_payments' });
        return { success: true };
    } catch (error) {
        console.error("Error notifying trader for payment:", error);
        return { success: false, error: "Failed to notify trader." };
    }
}

export async function recordPaymentByTraderAction({ orderId, amount }: { orderId: string; amount: number }) {
    try {
        const orderRef = doc(db, 'orders', orderId);

        await runTransaction(db, async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists()) {
                throw "Order does not exist!";
            }

            const currentAmountPaid = orderDoc.data().amountPaidByTrader || 0;
            const newAmountPaid = currentAmountPaid + amount;
            
            const currentPaymentHistory = orderDoc.data().paymentHistory || [];
            const newPaymentRecord = {
                amount: amount,
                type: 'Trader Payment',
                date: new Date()
            };

            transaction.update(orderRef, {
                amountPaidByTrader: newAmountPaid,
                paymentHistory: [...currentPaymentHistory, newPaymentRecord],
                updatedAt: serverTimestamp()
            });
        });

        return { success: true };

    } catch (error) {
        console.error("Error recording payment:", error);
        const errorMessage = typeof error === 'string' ? error : (error as Error).message;
        return { success: false, error: `Failed to record payment: ${errorMessage}` };
    }
}


export async function deleteNotificationAction(userType: string, userId: string, notificationId: string) {
    if (!userType || !userId || !notificationId) {
        return { success: false, error: "Missing required fields." };
    }
    
    let collectionName = '';
    if (userType === 'trader') collectionName = 'traders';
    else if (userType === 'driver') collectionName = 'drivers';
    else if (userType === 'transport_company') collectionName = 'transportCompanies';
    else return { success: false, error: 'Invalid user type for notification.' };

    try {
        const notificationRef = doc(db, `${collectionName}/${userId}/notifications/${notificationId}`);
        await deleteDoc(notificationRef);
        return { success: true };
    } catch (error) {
        console.error("Error deleting notification:", error);
        return { success: false, error: "Failed to delete notification." };
    }
}


export async function updateDriverStatusAction(input: UpdateDriverStatusInput) {
    try {
        if (!input.driverId) {
            throw new Error("User ID is required to update status.");
        }
        
        let userRef = doc(db, "drivers", input.driverId);
        let userDoc = await getDoc(userRef);
        let collectionName = 'drivers';

        if (!userDoc.exists()) {
            userRef = doc(db, "transportCompanies", input.driverId);
            userDoc = await getDoc(userRef);
            collectionName = 'transportCompanies';
            if (!userDoc.exists()) {
                 throw new Error("User not found in drivers or transport companies.");
            }
        }
        
        await updateDoc(userRef, {
            status: input.status
        });
        
        if (input.status === 'Active') {
            const title = 'Account Approved!';
            const description = `Your account has been approved. You can now log in and start receiving jobs.`;
            await sendNotification(collectionName, input.driverId, title, description, { view: collectionName === 'drivers' ? 'driver_dashboard' : 'transport_company_dashboard' });
        }
        
        return { success: true };
    } catch (error) {
        console.error("Error updating user status:", error);
        const errorMessage = typeof error === 'string' ? error : (error as Error).message;
        return { success: false, error: `Failed to update status: ${errorMessage}` };
    }
}

export async function updateTraderStatusAction(input: UpdateTraderStatusInput) {
    try {
        if (!input.traderId) {
            throw new Error("Trader ID is required to update status.");
        }
        const traderRef = doc(db, "traders", input.traderId);
        await updateDoc(traderRef, {
            status: input.status
        });

        if (input.status === 'Active') {
            const title = 'Account Approved!';
            const description = `Your account has been approved. You can now log in and place orders.`;
            await sendNotification('traders', input.traderId, title, description, { view: 'trader_dashboard' });
        }
        
        return { success: true };
    } catch (error) {
        console.error("Error updating trader status:", error);
        return { success: false, error: "Failed to update trader status." };
    }
}

export async function updateTransportCompanyStatusAction(input: UpdateTransportCompanyStatusInput) {
    try {
        if (!input.companyId) {
            throw new Error("Company ID is required to update status.");
        }
        const companyRef = doc(db, "transportCompanies", input.companyId);
        await updateDoc(companyRef, {
            status: input.status
        });

        if (input.status === 'Active') {
            const title = 'Account Approved!';
            const description = `Your account has been approved. You can now log in and manage your fleet.`;
            await sendNotification('transportCompanies', input.companyId, title, description, { view: 'transport_company_dashboard' });
        }
        
        return { success: true };
    } catch (error) {
        console.error("Error updating company status:", error);
        return { success: false, error: "Failed to update company status." };
    }
}


export async function createPaymentRequestAction(input: CreatePaymentRequestInput) {
    try {
        const orderRef = doc(db, "orders", input.orderId);
        const newRequest = {
            id: uuidv4(),
            ...input,
            status: 'Pending',
            createdAt: new Date(),
        }
        await updateDoc(orderRef, {
            paymentRequests: arrayUnion(newRequest)
        });

        // Also send a notification to the admin
        const adminNotifCol = collection(db, 'admin_notifications');
        await addDoc(adminNotifCol, {
            title: `Payment Request: ${input.requestType}`,
            description: `${input.driverName || input.companyName} requested AED ${input.amount.toFixed(2)} for order #${input.orderId.substring(0,6)}.`,
            isRead: false,
            createdAt: serverTimestamp(),
            data: { 
                view: 'payment_requests',
                requestId: newRequest.id
            },
        });

        return { success: true, request: newRequest };
    } catch (error) {
        console.error("Error creating payment request:", error);
        return { success: false, error: "Failed to create payment request." };
    }
}

export async function recordPayoutToAction(input: RecordPayoutInput) {
     try {
        const orderRef = doc(db, 'orders', input.orderId);
        const SERVICE_FEE_PERCENTAGE = 0.02;

        await runTransaction(db, async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists()) {
                throw "Order does not exist!";
            }

            const data = orderDoc.data();
            const currentAmountPaid = data.amountPaidToDriver || 0;
            const newAmountPaid = currentAmountPaid + input.amount;

            // Update the specific request to 'Paid'
            const updatedRequests = (data.paymentRequests || []).map((req: any) => 
                req.id === input.requestId ? { ...req, status: 'Paid' } : req
            );
            
            const currentPaymentHistory = data.paymentHistory || [];
            const newPaymentRecord = {
                amount: input.amount,
                type: 'Driver Payout',
                date: new Date()
            };
            
            // Check if the payment is fully settled
            const totalEarning = parseFloat(data.price || 0) * (1 - SERVICE_FEE_PERCENTAGE);
            let paymentStatus = data.paymentStatus;
            if (newAmountPaid >= totalEarning) {
                paymentStatus = 'Fully Paid';
            }

            transaction.update(orderRef, {
                amountPaidToDriver: newAmountPaid,
                paymentRequests: updatedRequests,
                paymentHistory: [...currentPaymentHistory, newPaymentRecord],
                paymentStatus: paymentStatus,
                updatedAt: serverTimestamp()
            });

            // Notify the driver
            const driverId = data.driverId;
            if (driverId) {
                await sendNotification('drivers', driverId, 'Payment Processed', `A payment of AED ${input.amount.toFixed(2)} for order #${input.orderId.substring(0,6)} has been processed.`, { orderId: input.orderId });
            }
        });

        return { success: true };

    } catch (error) {
        console.error("Error recording payout:", error);
        const errorMessage = typeof error === 'string' ? error : (error as Error).message;
        return { success: false, error: `Failed to record payout: ${errorMessage}` };
    }
}

export async function deleteOrderAction(orderId: string, userId: string) {
    try {
        if (!orderId || !userId) {
            throw new Error("Order ID and User ID are required.");
        }
        const orderRef = doc(db, "orders", orderId);
        
        // Atomically add the user's ID to the 'hiddenFor' array.
        await updateDoc(orderRef, {
            hiddenFor: arrayUnion(userId)
        });

        return { success: true };
    } catch (error) {
        console.error("Error hiding order:", error);
        const errorMessage = typeof error === 'string' ? error : (error as Error).message;
        return { success: false, error: `Failed to hide order: ${errorMessage}` };
    }
}

export async function hideAllUserHistoryAction(userId: string, userType: 'trader' | 'driver' | 'transport_company' | 'admin') {
    if (!userId || !userType) {
        return { success: false, error: "User ID and type are required." };
    }

    try {
        let queryField = '';
        if (userType === 'trader') queryField = 'traderId';
        else if (userType === 'driver') queryField = 'driverId';
        else if (userType === 'transport_company') queryField = 'driverId'; // Companies are also identified by driverId
        
        const q = query(
            collection(db, "orders"),
            where("status", "in", ["Delivered", "Cancelled"]),
            // Only apply user-specific filtering if not admin
            ...(userType !== 'admin' ? [where(queryField, "==", userId)] : [])
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: true, message: "No history found to hide." };
        }

        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
            const orderRef = doc.ref;
            batch.update(orderRef, { hiddenFor: arrayUnion(userId) });
        });

        await batch.commit();

        return { success: true };

    } catch (error) {
        console.error("Error hiding user history:", error);
        const errorMessage = typeof error === 'string' ? error : (error as Error).message;
        return { success: false, error: `Failed to hide history: ${errorMessage}` };
    }
}


export async function deleteAdminNotificationAction(notificationId: string) {
    if (!notificationId) {
        return { success: false, error: "Missing notification ID." };
    }
    try {
        const notificationRef = doc(db, `admin_notifications/${notificationId}`);
        await deleteDoc(notificationRef);
        return { success: true };
    } catch (error) {
        console.error("Error deleting admin notification:", error);
        return { success: false, error: "Failed to delete notification." };
    }
}

export async function deleteUserAction(userId: string, userType: string) {
    if (!userId || !userType) {
        return { success: false, error: "User ID and type are required." };
    }
    
    let collectionName = '';
    if (userType === 'trader') collectionName = 'traders';
    else if (userType === 'driver') collectionName = 'drivers';
    else if (userType === 'transport_company') collectionName = 'transportCompanies';
    else return { success: false, error: 'Invalid user type.' };

    try {
        const userRef = doc(db, collectionName, userId);
        await deleteDoc(userRef);
        // Note: This does not delete the user from Firebase Auth, which would require
        // an admin SDK and a cloud function for secure execution.
        return { success: true };
    } catch (error) {
        console.error("Error deleting user:", error);
        return { success: false, error: "Failed to delete user." };
    }
}

export async function uploadProfilePictureAction(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;

        if (!file || !userId) {
            throw new Error("File and user ID are required.");
        }

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        
        const fileName = `${userId}-${uuidv4()}.${file.name.split('.').pop()}`;
        const storageRef = ref(storage, `profile_pictures/${fileName}`);

        const snapshot = await uploadBytes(storageRef, fileBuffer, { contentType: file.type });
        const downloadURL = await getDownloadURL(snapshot.ref);

        return { success: true, url: downloadURL };
    } catch (error) {
        console.error("Error uploading profile picture:", error);
        return { success: false, error: "Failed to upload image." };
    }
}

export async function updateUserProfilePictureAction(userId: string, userType: string, photoURL: string) {
     if (!userId || !userType || !photoURL) {
        return { success: false, error: "User ID, type, and photo URL are required." };
    }
    
    let collectionName = '';
    if (userType === 'trader') collectionName = 'traders';
    else if (userType === 'driver') collectionName = 'drivers';
    else if (userType === 'transport_company') collectionName = 'transportCompanies';
    else return { success: false, error: 'Invalid user type.' };
    
    try {
        const userRef = doc(db, collectionName, userId);
        await updateDoc(userRef, { photoURL });
        return { success: true };
    } catch (error) {
        console.error("Error updating profile picture URL:", error);
        return { success: false, error: "Failed to update profile." };
    }
}


export async function uploadAppLogoAction(formData: FormData): Promise<{ success: boolean, url?: string, error?: string }> {
    try {
        const file = formData.get('file') as File;
        if (!file) throw new Error("No file provided.");

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        
        const fileName = `logo-${uuidv4()}.${file.name.split('.').pop()}`;
        const storageRef = ref(storage, `app_assets/${fileName}`);
        
        const snapshot = await uploadBytes(storageRef, fileBuffer, { contentType: file.type });
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return { success: true, url: downloadURL };
    } catch (error) {
        console.error("Error uploading app logo:", error);
        return { success: false, error: "Failed to upload app logo." };
    }
}

export async function updateAppLogoUrlAction(url: string) {
    try {
        const settingsRef = doc(db, 'settings', 'app_config');
        await setDoc(settingsRef, { logoUrl: url }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error updating app logo URL:", error);
        return { success: false, error: "Failed to update app logo URL." };
    }
}


export async function warnUserAction(userId: string, userType: 'trader' | 'driver' | 'transport_company') {
    if (!userId || !userType) {
        return { success: false, error: "User ID and type are required." };
    }
    
    let collectionName = '';
    const notificationTitle = 'Account Warning';
    const notificationDescription = 'A warning has been issued to your account due to a policy violation. Please adhere to the platform guidelines.';
    
    try {
        switch (userType) {
            case 'trader':
                collectionName = 'traders';
                break;
            case 'driver':
                collectionName = 'drivers';
                break;
            case 'transport_company':
                collectionName = 'transportCompanies';
                break;
            default:
                // This case should not be reachable due to TypeScript types
                return { success: false, error: 'Invalid user type.' };
        }

        const userRef = doc(db, collectionName, userId);
        await updateDoc(userRef, {
            status: 'Warned'
        });

        // Send a notification to the user who was warned
        await sendNotification(collectionName, userId, notificationTitle, notificationDescription);
        
        return { success: true };
    } catch (error) {
        console.error("Error warning user:", error);
        return { success: false, error: "Failed to warn user." };
    }
}


export async function uploadDocumentAction(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;

        if (!file || !userId) {
            throw new Error("File and userId are required.");
        }
        
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const uniqueFileName = `${userId}-${file.name}-${uuidv4()}`;
        const storageRef = ref(storage, `user_documents/${uniqueFileName}`);

        const snapshot = await uploadBytes(storageRef, fileBuffer, { contentType: file.type });
        const downloadURL = await getDownloadURL(snapshot.ref);

        return { success: true, url: downloadURL };
    } catch (error) {
        console.error("Error uploading document:", error);
        return { success: false, error: "Failed to upload document." };
    }
}


export async function updateTraderProfileAction(userId: string, data: UpdateTraderProfileInput) {
    if (!userId) return { success: false, error: "User ID is required." };
    try {
        const traderRef = doc(db, 'traders', userId);
        await updateDoc(traderRef, data);
        return { success: true };
    } catch (error) {
        console.error("Error updating trader profile:", error);
        return { success: false, error: "Failed to update profile." };
    }
}

export async function updateDriverProfileAction(userId: string, data: UpdateDriverProfileInput) {
    if (!userId) return { success: false, error: "User ID is required." };
    try {
        const driverRef = doc(db, 'drivers', userId);
        await updateDoc(driverRef, data);
        return { success: true };
    } catch (error) {
        console.error("Error updating driver profile:", error);
        return { success: false, error: "Failed to update profile." };
    }
}

export async function updateTransportCompanyProfileAction(userId: string, data: UpdateTransportCompanyProfileInput) {
    if (!userId) return { success: false, error: "User ID is required." };
    try {
        const companyRef = doc(db, 'transportCompanies', userId);
        await updateDoc(companyRef, data);
        return { success: true };
    } catch (error) {
        console.error("Error updating transport company profile:", error);
        return { success: false, error: "Failed to update profile." };
    }
}

export async function updateDriverLocationAction(driverId: string, location: { latitude: number; longitude: number }) {
    if (!driverId || !location) {
        return { success: false, error: "Driver ID and location are required." };
    }
    try {
        const driverRef = doc(db, 'drivers', driverId);
        await updateDoc(driverRef, {
            currentLocation: new GeoPoint(location.latitude, location.longitude)
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating driver location:", error);
        return { success: false, error: "Failed to update driver location." };
    }
}
