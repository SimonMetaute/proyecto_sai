import type { RowDataPacket } from 'mysql2/promise';
import type { UserRepository } from '../../domain/ports/out/UserRepository.js';
import { User, IdentityDocument, UserType } from '../../domain/model/user.js';
import { pool } from '../database/mysql-pool.js';

interface UserRow extends RowDataPacket {
  userId: string;
  userType: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  identityDocumentType: string;
  identityDocumentNumber: string;
  registrationDate: Date;
  status: string;
  updateDate: Date;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toDomain(row: UserRow): User {
  return new User({
    userId: row.userId,
    userType: row.userType as UserType,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    password: row.password,
    phone: row.phone,
    identityDocument: new IdentityDocument(row.identityDocumentType, row.identityDocumentNumber),
    registrationDate: toDate(row.registrationDate),
    status: row.status,
    updateDate: toDate(row.updateDate),
  });
}

export class MySQLUserRepository implements UserRepository {
  async save(user: User): Promise<void> {
    await pool.execute(
      `INSERT INTO users (
        userId, userType, firstName, lastName, email, password, phone,
        identityDocumentType, identityDocumentNumber,
        registrationDate, status, updateDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        userType = VALUES(userType),
        firstName = VALUES(firstName),
        lastName = VALUES(lastName),
        email = VALUES(email),
        password = VALUES(password),
        phone = VALUES(phone),
        identityDocumentType = VALUES(identityDocumentType),
        identityDocumentNumber = VALUES(identityDocumentNumber),
        registrationDate = VALUES(registrationDate),
        status = VALUES(status),
        updateDate = VALUES(updateDate)`,
      [
        user.userId,
        user.userType,
        user.firstName,
        user.lastName,
        user.email,
        user.password,
        user.phone,
        user.identityDocument.type,
        user.identityDocument.number,
        user.registrationDate,
        user.status,
        user.updateDate,
      ],
    );
  }

  async findById(id: string): Promise<User | null> {
    const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE userId = ? LIMIT 1', [id]);
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    return toDomain(row);
  }

  async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    return toDomain(row);
  }
}
