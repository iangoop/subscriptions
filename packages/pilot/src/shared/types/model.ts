import { object, string, number, date, InferType } from 'yup';
import { t } from 'i18next';

export type BaseObject = {
  id?: string;
};

export const ProductSchema = object({
  id: string(),
  sku: string().required(t('general.required')),
  name: string().required(),
  shortDescription: string().required(),
  longDescription: string().required(),
  thumbnailUrl: string().required().url(),
  price: number().required().positive(),
  qtyInStock: number().required().min(0).integer(),
});

export type Product = InferType<typeof ProductSchema>;

export type PaginationQuery<T> = {
  count: number;
  next?: string;
  data: T[];
};
