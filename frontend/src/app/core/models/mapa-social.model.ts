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
  website?: string;
  type: string;
  ciudad: string;
  verified: boolean;
  createdAt?: string;
}

export interface Need {
  id: number;
  userId: number;
  categoryId: number;
  category?: Category;
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
  isPrivate?: boolean;
  urgency?: 'baja' | 'media' | 'alta';
  status: string;
  resolvedBy?: { id: number; firstName: string; lastName: string } | null;
  resolvedAt?: string | null;
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
  resolvedBy?: { id: number; firstName: string; lastName: string } | null;
  resolvedAt?: string | null;
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

export interface CreatePrivateNeedPayload {
  categoryId: number;
  description: string;
  urgency: 'baja' | 'media' | 'alta';
  contactInfo: string;
  latitude: number;
  longitude: number;
  locality?: string;
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

export interface CollaborationRequest {
  id: number;
  organizationId: number;
  contactName: string;
  contactEmail: string;
  message?: string;
  createdAt: string;
}

export interface CreateCollaborationRequestPayload {
  contactName: string;
  contactEmail: string;
  message?: string;
  // Honeypot anti-spam: siempre vacío para una persona real.
  website?: string;
}

export interface ResourceRequest {
  id: number;
  userId: number;
  resourceId: number;
  organizationId: number;
  detailText?: string;
  createdAt: string;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  resource?: Resource;
  organization?: Organization;
}

export interface CreateResourceRequestPayload {
  detailText?: string;
}
