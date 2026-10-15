import type { Request, Response } from 'express';
import type { LoginUseCase } from '../../../application/use-cases/LoginUseCase.js';
import { InvalidCredentialsError } from '../../../application/use-cases/LoginUseCase.js';

export class AuthController {
  private readonly loginUseCase: LoginUseCase;

  constructor(loginUseCase: LoginUseCase) {
    this.loginUseCase = loginUseCase;
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.loginUseCase.execute(req.body);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        res.status(401).json({ message: error.message });
      } else {
        res.status(400).json({ message: error instanceof Error ? error.message : 'Bad Request' });
      }
    }
  }
}
