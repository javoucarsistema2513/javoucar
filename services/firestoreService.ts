import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  addDoc,
  updateDoc,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './firestoreClient';
import { UserData, VehicleData } from '../types';

export const firestoreService = {
  // User authentication
  async signUp(email: string, password: string, userData: UserData) {
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with display name
      await updateProfile(userCredential.user, {
        displayName: userData.name
      });

      // Create user document in 'users' collection
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, {
        id: userCredential.user.uid,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        createdAt: Timestamp.now(),
      });

      return { success: true, data: userCredential.user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error };
    }
  },

  async signIn(email: string, password: string) {
    try {
      // Sign in user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Get user profile data
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { 
          success: true, 
          data: { 
            ...userCredential.user, 
            profile: userSnap.data() 
          } 
        };
      } else {
        // User document doesn't exist, create it
        const userData = {
          id: userCredential.user.uid,
          name: userCredential.user.displayName || '',
          email: userCredential.user.email,
          phone: '',
          createdAt: Timestamp.now(),
        };
        
        await setDoc(userRef, userData);
        
        return { 
          success: true, 
          data: { 
            ...userCredential.user, 
            profile: userData
          } 
        };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error };
    }
  },

  async signOut() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error };
    }
  },

  async recoverPassword(email: string) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('Password recovery error:', error);
      return { success: false, error };
    }
  },

  // User management
  async getUserProfile(userId: string) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { success: true, data: userSnap.data() };
      } else {
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      console.error('Get user profile error:', error);
      return { success: false, error };
    }
  },

  // Vehicle management
  async registerVehicle(vehicleData: VehicleData, userId: string) {
    try {
      // Add vehicle to 'vehicles' collection
      const vehicleRef = await addDoc(collection(db, 'vehicles'), {
        userId: userId,
        plate: vehicleData.plate,
        model: vehicleData.model,
        color: vehicleData.color,
        state: vehicleData.state,
        createdAt: Timestamp.now(),
      });

      // Get the created vehicle document
      const vehicleSnap = await getDoc(vehicleRef);
      
      if (vehicleSnap.exists()) {
        return { success: true, data: { id: vehicleRef.id, ...vehicleSnap.data() } };
      } else {
        return { success: false, error: 'Failed to retrieve vehicle data' };
      }
    } catch (error) {
      console.error('Vehicle registration error:', error);
      return { success: false, error };
    }
  },

  async getUserVehicles(userId: string) {
    try {
      // Query vehicles for the specific user
      const q = query(
        collection(db, 'vehicles'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const vehicles = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, data: vehicles };
    } catch (error) {
      console.error('Get user vehicles error:', error);
      return { success: false, error };
    }
  },

  async getVehicleByPlate(plate: string) {
    try {
      // Query vehicle by plate
      const q = query(
        collection(db, 'vehicles'),
        where('plate', '==', plate),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const vehicleDoc = querySnapshot.docs[0];
        const vehicleData = vehicleDoc.data();
        
        // Get user data
        const userRef = doc(db, 'users', vehicleData.userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          return { 
            success: true, 
            data: { 
              ...vehicleData, 
              id: vehicleDoc.id,
              user: userSnap.data()
            } 
          };
        } else {
          return { 
            success: true, 
            data: { 
              ...vehicleData, 
              id: vehicleDoc.id,
              user: null
            } 
          };
        }
      } else {
        return { success: false, error: 'Vehicle not found' };
      }
    } catch (error) {
      console.error('Get vehicle by plate error:', error);
      return { success: false, error };
    }
  },

  // Alert system
  async sendAlert(
    targetPlate: string,
    message: string,
    senderUserId: string,
    alertType?: string
  ) {
    try {
      // Get target vehicle and user
      const vehicleResult = await this.getVehicleByPlate(targetPlate);
      if (!vehicleResult.success) {
        throw new Error('Vehicle not found');
      }

      // Add alert to 'alerts' collection
      const alertRef = await addDoc(collection(db, 'alerts'), {
        senderUserId: senderUserId,
        targetPlate: targetPlate,
        message: message,
        alertType: alertType || 'info',
        createdAt: Timestamp.now(),
        isRead: false,
      });

      // Get the created alert document
      const alertSnap = await getDoc(alertRef);
      
      if (alertSnap.exists()) {
        return { 
          success: true, 
          data: { id: alertRef.id, ...alertSnap.data() }, 
          vehicleData: vehicleResult.data 
        };
      } else {
        return { success: false, error: 'Failed to retrieve alert data' };
      }
    } catch (error) {
      console.error('Send alert error:', error);
      return { success: false, error };
    }
  },

  async getUserAlerts(userId: string) {
    try {
      // Query alerts for the user (sent by user or targeted to user's vehicles)
      const userVehicles = await this.getUserVehicles(userId);
      let plates = [];
      
      if (userVehicles.success && userVehicles.data.length > 0) {
        plates = userVehicles.data.map((vehicle: any) => vehicle.plate);
      }

      // Create query for alerts
      let conditions = [
        where('senderUserId', '==', userId)
      ];
      
      if (plates.length > 0) {
        conditions.push(where('targetPlate', 'in', plates));
      }

      const q = query(
        collection(db, 'alerts'),
        ...conditions,
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const alerts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Populate sender and vehicle data for each alert
      const populatedAlerts = [];
      for (const alert of alerts) {
        // Get sender data
        const senderResult = await this.getUserProfile(alert.senderUserId);
        const sender = senderResult.success ? senderResult.data : null;

        // Get vehicle data if it's not sent by this user
        let vehicle = null;
        if (alert.senderUserId !== userId) {
          const vehicleResult = await this.getVehicleByPlate(alert.targetPlate);
          vehicle = vehicleResult.success ? vehicleResult.data : null;
        }

        populatedAlerts.push({
          ...alert,
          sender,
          vehicle
        });
      }

      return { success: true, data: populatedAlerts };
    } catch (error) {
      console.error('Get user alerts error:', error);
      return { success: false, error };
    }
  },

  async markAlertAsRead(alertId: string) {
    try {
      const alertRef = doc(db, 'alerts', alertId);
      await updateDoc(alertRef, {
        isRead: true,
        readAt: Timestamp.now()
      });

      // Get updated alert
      const alertSnap = await getDoc(alertRef);
      
      if (alertSnap.exists()) {
        return { success: true, data: { id: alertId, ...alertSnap.data() } };
      } else {
        return { success: false, error: 'Failed to retrieve alert data' };
      }
    } catch (error) {
      console.error('Mark alert as read error:', error);
      return { success: false, error };
    }
  },
};