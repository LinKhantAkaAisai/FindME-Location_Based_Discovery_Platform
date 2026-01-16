export interface CreateShopRequest {
  name: string;
  description?: string;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
}

export interface ShopResponse extends CreateShopRequest {
  shop_id: number;
  owner_id: number;
  created_at: Date | string;
}