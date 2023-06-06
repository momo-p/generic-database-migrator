export type ExecutorFn = (command: string) => Promise<void>;

export class SimpleSynchronizer {
  readonly commands: string[];
  private readonly batchSize: number;

  constructor({
    commands,
    batchSize,
  }: {
    commands: string[];
    batchSize?: number;
  }) {
    this.commands = commands.map((command) => command);
    this.batchSize = batchSize ?? 5;
  }

  async execute({ executor }: { executor: ExecutorFn }) {
    for (let i = 0; i < this.commands.length; i += this.batchSize) {
      const batch = this.commands.slice(i, i + this.batchSize);
      await this.executeBatch(executor, batch);
    }
  }

  private async executeBatch(executor: ExecutorFn, commands: string[]) {
    const jobs = commands.map((command) => executor(command));
    await Promise.allSettled(jobs);
  }
}
