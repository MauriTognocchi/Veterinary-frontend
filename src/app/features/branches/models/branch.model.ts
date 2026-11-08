import { AddressRequest, AddressResponse } from '../../owners/models/address.model';

export interface BranchRequest {
  name: string;
  phone: string;
  email: string;
  openingTime: string;
  closingTime: string;
  address: AddressRequest;
}

export interface BranchResponse {
  externalId: string;
  name: string;
  phone: string;
  email: string;
  openingTime: string;
  closingTime: string;
  address: AddressResponse | null;
}
