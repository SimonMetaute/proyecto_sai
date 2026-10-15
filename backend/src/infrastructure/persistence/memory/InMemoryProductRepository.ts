import type { ProductRepository } from '../../../domain/ports/out/ProductRepository.js';
import { Product } from '../../../domain/model/product.js';

export class InMemoryProductRepository implements ProductRepository {
  private readonly products: Map<string, Product> = new Map();

  async save(product: Product): Promise<void> {
    this.products.set(product.productId, product);
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) ?? null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    for (const product of this.products.values()) {
      if (product.sku === sku) {
        return product;
      }
    }
    return null;
  }
}
