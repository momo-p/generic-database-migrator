export type ExecutorFn = (command: string) => Promise<void>;
export type SynchronizerFn<Context> = (context: Context) => Promise<void>;
export type Synchronizer<Context> =
  | SimpleSynchronizer
  | CustomSynchronizer<Context>
  | MixedSynchronizer<Context>;

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
    await Promise.all(jobs);
  }
}

export class CustomSynchronizer<Context> {
  private readonly synchronizer: SynchronizerFn<Context>;

  constructor({ synchronizer }: { synchronizer: SynchronizerFn<Context> }) {
    this.synchronizer = synchronizer;
  }

  async execute({ context }: { context: Context }) {
    await this.synchronizer(context);
  }
}

export class MixedSynchronizer<Context> {
  private readonly synchronizers: Array<Synchronizer<Context>>;

  constructor({
    synchronizers,
  }: {
    synchronizers: Array<Synchronizer<Context>>;
  }) {
    this.synchronizers = synchronizers.map((synchronizer) => synchronizer);
  }

  async execute({
    executor,
    context,
  }: {
    executor: ExecutorFn;
    context: Context;
  }) {
    for (const synchronizer of this.synchronizers) {
      if (synchronizer instanceof SimpleSynchronizer) {
        await (synchronizer as SimpleSynchronizer).execute({ executor });
      } else if (synchronizer instanceof CustomSynchronizer) {
        await (synchronizer as CustomSynchronizer<Context>).execute({
          context,
        });
      } else {
        await (synchronizer as MixedSynchronizer<Context>).execute({
          executor,
          context,
        });
      }
    }
  }
}
