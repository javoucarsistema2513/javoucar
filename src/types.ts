export interface Visitor {
  id?: string;
  name: string;
  phone: string;
  address: string;
  age?: number;
  gender?: string;
  birthDate?: string;
  participatesInCell?: string;
  cellLeader?: string;
  category?: 'homens' | 'mulheres' | 'jovens';
  isMarriedOrLivesTogether?: string;
  prayerRequest?: string;
  invitedBy?: string;
  observation?: string;
  createdAt: any; // ServerTimestamp
  createdBy: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
