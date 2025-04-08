import { object, string, number, InferType, bool } from 'yup';

export type BaseObject = {
  id?: string;
};

export const ProductSchema = object({
  id: string(),
  sku: string().required(),
  name: string().required(),
  shortDescription: string().required(),
  longDescription: string().required(),
  thumbnailUrl: string().required().url(),
  price: number().required().positive(),
  qtyInStock: number().required().min(0).integer(),
});

export type Product = InferType<typeof ProductSchema>;

export const CustomerSchema = object({
  id: string(),
  email: string().required(),
  firstName: string().required(),
  lastName: string().required(),
});

export type Customer = InferType<typeof CustomerSchema>;

export const CustomerAddressSchema = object({
  id: string(),
  firstName: string().required(),
  middleName: string().optional(),
  lastName: string().required(),
  company: string().optional(),
  street1: string().required(),
  street2: string().optional(),
  street3: string().optional(),
  city: string().required(),
  region: string().optional(),
  postcode: string().required(),
  country: string().optional(),
  phone: string().optional(),
  isDefault: bool().default(false),
  isDefaultBilling: bool().default(false),
  isDefaultShipping: bool().default(false),
  isActive: bool().default(true),
});

export type CustomerAddress = InferType<typeof CustomerAddressSchema>;

export type PaginationQuery<T> = {
  count: number;
  next?: string;
  data: T[];
};

export type Archivable = {
  isActive: boolean;
};
