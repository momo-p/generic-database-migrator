import { PromisePool } from "@supercharge/promise-pool";
import { ExecutorFn, Synchronizer, MixedSynchronizer } from "./synchronizer";

export type MarkFn = ({
  feature,
  version,
}: {
  feature: string;
  version: number;
}) => Promise<void>;

export type FetchMarkFn = ({ feature }: { feature: string }) => Promise<number>;

export interface MigrationMarker {
  readonly mark: MarkFn;
  readonly fetch: FetchMarkFn;
}

export type SynchronizerGroup<Context> = {
  [key: string]: Array<Synchronizer<Context>>;
};

export class Migrator<Context> {
  private readonly executor: ExecutorFn;
  private readonly context: Context;
  private readonly marker: MigrationMarker;
  private readonly synchronizers: SynchronizerGroup<Context>;
  private readonly poolSize: number;

  constructor({
    executor,
    context,
    marker,
    synchronizers,
    poolSize,
  }: {
    executor: ExecutorFn;
    context: Context;
    marker: MigrationMarker;
    synchronizers: SynchronizerGroup<Context>;
    poolSize?: number;
  }) {
    this.executor = executor;
    this.context = context;
    this.marker = marker;
    this.synchronizers = synchronizers;
    this.poolSize = poolSize ?? 5;
  }

  async execute() {
    await PromisePool.withConcurrency(this.poolSize)
      .for(
        Object.keys(this.synchronizers).map((feature) => {
          return { feature, synchronizers: this.synchronizers[feature] };
        })
      )
      .process(async (item) => {
        await this.resolveGroup(item.feature, item.synchronizers);
      });
  }

  private async resolveGroup(
    feature: string,
    synchronizers: Array<Synchronizer<Context>>
  ) {
    const currentVersion = await this.marker.fetch({ feature });
    for (let i = currentVersion; i < synchronizers.length; ++i) {
      await new MixedSynchronizer<Context>({
        synchronizers: [synchronizers[i]],
      }).execute({
        executor: this.executor,
        context: this.context,
      });
      await this.marker.mark({ feature, version: i + 1 });
    }
  }
}
