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
  organizationName?: string;
  schedule?: string;
  contactName?: string;
  contactInfo?: string;
  status: string;
  createdAt: string;
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
}
