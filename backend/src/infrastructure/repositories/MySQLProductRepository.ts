import type { RowDataPacket } from 'mysql2/promise';
import type { ProductRepository } from '../../domain/ports/out/ProductRepository.js';
import { Product } from '../../domain/model/product.js';
import { pool } from '../database/mysql-pool.js';

interface ProductRow extends RowDataPacket {
  productId: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  sellerId: string;
  basePrice: number | string;
  productStatus: string;
  publicationDate: Date | string;
  brand: string;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

function toDomain(row: ProductRow): Product {
  return new Product({
    productId: row.productId,
    name: row.name,
    description: row.description,
    category: row.category,
    sku: row.sku,
    sellerId: row.sellerId,
    basePrice: toNumber(row.basePrice),
    productStatus: row.productStatus,
    publicationDate: toDate(row.publicationDate),
    brand: row.brand,
  });
}

export class MySQLProductRepository implements ProductRepository {
  async save(product: Product): Promise<void> {
    await pool.execute(
      `INSERT INTO products (
        productId, name, description, category, sku, sellerId,
        basePrice, productStatus, publicationDate, brand
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        category = VALUES(category),
        sku = VALUES(sku),
        sellerId = VALUES(sellerId),
        basePrice = VALUES(basePrice),
        productStatus = VALUES(productStatus),
        publicationDate = VALUES(publicationDate),
        brand = VALUES(brand)`,
      [
        product.productId,
        product.name,
        product.description,
        product.category,
        product.sku,
        product.sellerId,
        product.basePrice,
        product.productStatus,
        product.publicationDate,
        product.brand,
      ],
    );
  }

  async findById(id: string): Promise<Product | null> {
    const [rows] = await pool.query<ProductRow[]>('SELECT * FROM products WHERE productId = ? LIMIT 1', [id]);
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    return toDomain(row);
  }

  async findBySku(sku: string): Promise<Product | null> {
    const [rows] = await pool.query<ProductRow[]>('SELECT * FROM products WHERE sku = ? LIMIT 1', [sku]);
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    return toDomain(row);
  }
}
