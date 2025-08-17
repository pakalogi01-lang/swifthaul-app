
'use server';

import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    deleteUser
} from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { createDriverAction, createTraderAction, createTransportCompanyAction } from '../actions';
import type { CreateDriverInput } from '@/schemas/driver';
import type { CreateTraderInput } from '@/schemas/trader';
import type { CreateTransportCompanyInput } from '@/schemas/transportCompany';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const auth = getAuth(app);

export async function signUpDriverWithEmailAndPassword(password: string, driverData: CreateDriverInput) {
    try {
        if (!driverData.email) {
            return { success: false, error: "Email is required." };
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, driverData.email, password);
        const user = userCredential.user;

        if (user) {
            // Now create the driver profile in Firestore
            const driverProfileResult = await createDriverAction(driverData);
            if (driverProfileResult.success) {
                return { success: true, userId: user.uid, driverId: driverProfileResult.id };
            } else {
                // If profile creation fails, delete the auth user to prevent orphans
                await deleteUser(user);
                return { success: false, error: `Profile creation failed: ${driverProfileResult.error}` };
            }
        }
        return { success: false, error: 'User could not be created.' };

    } catch (error: any) {
        console.error("Firebase Auth Error:", error);
        return { success: false, error: error.message || 'An unknown error occurred.' };
    }
}

export async function signUpTraderWithEmailAndPassword(password: string, traderData: CreateTraderInput) {
    try {
        if (!traderData.email) {
            return { success: false, error: "Email is required." };
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, traderData.email, password);
        const user = userCredential.user;

        if (user) {
            const traderProfileResult = await createTraderAction(traderData);
            if (traderProfileResult.success) {
                return { success: true, userId: user.uid, traderId: traderProfileResult.id };
            } else {
                // If profile creation fails, delete the auth user to prevent orphans
                await deleteUser(user);
                return { success: false, error: `Profile creation failed: ${traderProfileResult.error}` };
            }
        }
        return { success: false, error: 'User could not be created.' };

    } catch (error: any) {
        console.error("Firebase Auth Error:", error);
        return { success: false, error: error.message || 'An unknown error occurred.' };
    }
}

export async function signUpTransportCompanyWithEmailAndPassword(password: string, companyData: CreateTransportCompanyInput) {
    try {
        if (!companyData.email) {
            return { success: false, error: "Email is required." };
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, companyData.email, password);
        const user = userCredential.user;

        if (user) {
            const companyProfileResult = await createTransportCompanyAction(companyData);
            if (companyProfileResult.success) {
                return { success: true, userId: user.uid, companyId: companyProfileResult.id };
            } else {
                 // If profile creation fails, delete the auth user to prevent orphans
                await deleteUser(user);
                return { success: false, error: `Profile creation failed: ${companyProfileResult.error}` };
            }
        }
        return { success: false, error: 'User could not be created.' };

    } catch (error: any) {
        console.error("Firebase Auth Error:", error);
        return { success: false, error: error.message || 'An unknown error occurred.' };
    }
}


export async function signInWithEmail(email: string, password: string) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // In a real app, you'd find the user profile in Firestore here
        // and return the appropriate user type. For now, we'll just return success.
        return { success: true, userId: userCredential.user.uid };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function signInAdmin(email: string, password: string) {
    // TEMPORARY FIX: Hardcode credentials to unblock admin login.
    const adminEmail = "admin@swifthaul.com";
    const adminPassword = "password";

    if (email === adminEmail && password === adminPassword) {
        return { success: true, identifier: 'admin_user' };
    } else {
        return { success: false, error: 'Invalid admin credentials.' };
    }
}

export async function sendPasswordResetEmailAction(email: string) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error: any) {
        console.error("Password Reset Error:", error);
        return { success: false, error: error.message };
    }
}

export async function loginCompanyDriverAction(driverName: string, passport: string) {
    try {
        if (!driverName || !passport) {
            return { success: false, error: "Driver name and passport are required." };
        }
        
        const q = query(
            collection(db, "drivers"), 
            where("fullName", "==", driverName),
            where("passport", "==", passport)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: "Invalid driver name or passport." };
        }

        const driverDoc = querySnapshot.docs[0];
        if (!driverDoc.data().companyId) {
            return { success: false, error: "This login is only for company drivers." };
        }
        
        // We are not using Firebase Auth here, just verifying details in Firestore
        // so we return the driver's name as the identifier
        return { success: true, identifier: driverName };

    } catch (error: any) {
        console.error("Company Driver Login Error:", error);
        return { success: false, error: error.message || 'An unknown error occurred.' };
    }
}
