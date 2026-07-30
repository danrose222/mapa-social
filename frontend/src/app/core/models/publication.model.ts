export interface CreateNeedPayload {
  title: string;
  categoryId: number;
  locality: string;
  description: string;
  address: string;
  contactName: string;
  contactInfo: string;
}

export interface CreateResourcePayload {
  title: string;
  categoryId: number;
  organization: string;
  description: string;
  location: string;
  schedule: string;
  contactInfo: string;
}
