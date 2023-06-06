import * as assert from "assert";
import AsyncLock = require("async-lock");
import { SimpleSynchronizer } from "../src";

describe("simple synchronizer test", () => {
  it("all the commands executed.", async () => {
    const commands = ["1.1", "1.2", "1.3", "1.4", "1.5"];
    const executedCommands = [];
    const lock = new AsyncLock();

    const synchronizer = new SimpleSynchronizer({
      commands,
      batchSize: 2,
    });
    await synchronizer.execute({
      executor: async (command: string) => {
        lock.acquire("lock", (done: any) => {
          executedCommands.push(command);
          done();
        });
      },
    });
    assert.deepEqual(commands.sort(), executedCommands.sort());
  });
});
