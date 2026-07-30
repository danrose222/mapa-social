export interface CreateNeedPayload {
  title: string;
  categoryId: number;
  description: string;
  address: string;
  contactName: string;
  contactInfo: string;
  latitude: number;
  longitude: number;
}

export interface CreateResourcePayload {
  title: string;
  categoryId: number;
  organizationName: string;
  description: string;
  address: string;
  schedule: string;
  contactInfo: string;
  latitude: number;
  longitude: number;
}
