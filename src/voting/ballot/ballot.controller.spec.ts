import { Test, TestingModule } from '@nestjs/testing';
import { BallotController } from './ballot.controller';

describe('BallotController', () => {
  let controller: BallotController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BallotController],
    }).compile();

    controller = module.get<BallotController>(BallotController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
