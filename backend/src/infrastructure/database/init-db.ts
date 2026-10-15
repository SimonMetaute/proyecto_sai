import { pool } from './mysql-pool.js';

/**
 * Ensures the `users` table exists, mapping the `User` aggregate fields.
 * Idempotent: safe to run on every boot.
 */
export async function initDb(): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      userId VARCHAR(36) PRIMARY KEY,
      userType VARCHAR(50) NOT NULL,
      firstName VARCHAR(100) NOT NULL,
      lastName VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      identityDocumentType VARCHAR(50) NOT NULL,
      identityDocumentNumber VARCHAR(100) NOT NULL,
      registrationDate DATETIME NOT NULL,
      status VARCHAR(50) NOT NULL,
      updateDate DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS products (
      productId VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      sku VARCHAR(100) NOT NULL UNIQUE,
      sellerId VARCHAR(36) NOT NULL,
      basePrice DECIMAL(10, 2) NOT NULL,
      productStatus VARCHAR(50) NOT NULL,
      publicationDate DATETIME NOT NULL,
      brand VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}
