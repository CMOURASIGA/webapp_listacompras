export interface PriceProviderResult { productName: string; price: number; source: 'promotion' | 'external_api'; capturedAt: string }
export interface PriceProvider { findProductByEAN(ean: string): Promise<{ name: string; brand?: string } | null>; getCurrentPrice(productId: string, marketId?: string): Promise<PriceProviderResult | null>; getOffers(productId: string): Promise<PriceProviderResult[]>; getPriceHistory(productId: string): Promise<PriceProviderResult[]> }

