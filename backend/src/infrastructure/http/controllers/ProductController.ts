import type { Request, Response } from 'express';
import type { CreateProductUseCase } from '../../../application/use-cases/CreateProductUseCase.js';
import { SkuAlreadyExistsError } from '../../../application/use-cases/CreateProductUseCase.js';

export class ProductController {
  private readonly createProductUseCase: CreateProductUseCase;

  constructor(createProductUseCase: CreateProductUseCase) {
    this.createProductUseCase = createProductUseCase;
  }

  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = await this.createProductUseCase.execute(req.body);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof SkuAlreadyExistsError) {
        res.status(409).json({ message: error.message });
      } else {
        res.status(400).json({ message: error instanceof Error ? error.message : 'Bad Request' });
      }
    }
  }
}
