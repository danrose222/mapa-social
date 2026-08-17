export interface Category {
  id: number;
  name: string;
  description?: string;
  active: boolean;
}

export interface Organization {
  id: number;
  name: string;
  description?: string;
  contactInfo?: string;
  address?: string;
  type: string;
  ciudad: string;
  verified: boolean;
}

export interface Need {
  id: number;
  userId: number;
  categoryId: number;
  organizationId?: number;
  organization?: Organization;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  locality?: string;
  contactName?: string;
  contactInfo?: string;
  imageUrl?: string;
  requiresSolicitud?: boolean;
  status: string;
  createdAt: string;
}

export interface Resource {
  id: number;
  userId: number;
  categoryId: number;
  organizationId?: number;
  organization?: Organization;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  schedule?: string;
  contactName?: string;
  contactInfo?: string;
  imageUrl?: string;
  status: string;
  createdAt: string;
}

export interface Solicitud {
  id: number;
  needId: number;
  helperUserId: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  respondedAt?: string;
  helper?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  need?: Need;
}

export interface CreateNeedPayload {
  title: string;
  description: string;
  categoryId: number;
  latitude: number;
  longitude: number;
  address?: string;
  locality?: string;
  contactName?: string;
  contactInfo?: string;
  imageUrl?: string;
}

export interface CreateResourcePayload {
  title: string;
  description: string;
  categoryId: number;
  latitude: number;
  longitude: number;
  address?: string;
  schedule?: string;
  contactName?: string;
  contactInfo?: string;
  imageUrl?: string;
}
