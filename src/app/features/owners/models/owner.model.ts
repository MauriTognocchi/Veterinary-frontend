import { AddressRequest, AddressResponse } from './address.model';

export interface OwnerRequest {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dni: string;
  address: AddressRequest | null;
}

export interface OwnerWithCredentialsRequest {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dni: string;
  address: AddressRequest;
  password: string;
}

export interface OwnerResponse {
  externalId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dni: string;
  address: AddressResponse | null;
}
