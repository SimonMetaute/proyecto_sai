import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { UserRepository } from '../../domain/ports/out/UserRepository.js';

export interface LoginParams {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  userId: string;
  userType: string;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password.');
    this.name = 'InvalidCredentialsError';
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'nexusmarket-dev-secret';

export class LoginUseCase {
  private readonly userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  async execute(params: LoginParams): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(params.email);
    if (user === null) {
      throw new InvalidCredentialsError();
    }
    const matches = await bcrypt.compare(params.password, user.password);
    if (!matches) {
      throw new InvalidCredentialsError();
    }
    const token = jwt.sign(
      { userId: user.userId, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    return { token, userId: user.userId, userType: user.userType };
  }
}
