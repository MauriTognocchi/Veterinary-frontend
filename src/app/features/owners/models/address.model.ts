export interface AddressRequest {
  street: string;
  number: string;
  city: string;
  province: string;
  country: string;
}

export interface AddressResponse {
  id: number;
  street: string;
  number: string;
  city: string;
  province: string;
  country: string;
}
