import type { Product } from '../../../domain/model/product.js';

export class ProductMapper {
  static toResponse(product: Product): Record<string, unknown> {
    return {
      productId: product.productId,
      name: product.name,
      description: product.description,
      category: product.category,
      sku: product.sku,
      sellerId: product.sellerId,
      basePrice: product.basePrice,
      productStatus: product.productStatus,
      publicationDate: product.publicationDate,
      brand: product.brand,
    };
  }
}
