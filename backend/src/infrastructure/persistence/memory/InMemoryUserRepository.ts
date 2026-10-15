import type { UserRepository } from '../../../domain/ports/out/UserRepository.js';
import { User } from '../../../domain/model/user.js';

export class InMemoryUserRepository implements UserRepository {
  private readonly users: Map<string, User> = new Map();

  async save(user: User): Promise<void> {
    this.users.set(user.userId, user);
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }
}
