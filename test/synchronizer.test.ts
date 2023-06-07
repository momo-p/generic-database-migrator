import * as assert from "assert";
import AsyncLock = require("async-lock");
import { waitUntil } from "./utils";
import { SimpleSynchronizer, CustomSynchronizer } from "../src";

describe("simple synchronizer test.", () => {
  it("single command executed.", async () => {
    const commands = ["1.1"];
    const executedCommands = [];
    const lock = new AsyncLock();

    const synchronizer = new SimpleSynchronizer({
      commands,
      batchSize: 2,
    });
    await synchronizer.execute({
      executor: async (command: string) => {
        lock.acquire("lock", (done: () => void) => {
          executedCommands.push(command);
          done();
        });
      },
    });
    assert.deepEqual(commands.sort(), executedCommands.sort());
  });

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
        lock.acquire("lock", (done: () => void) => {
          executedCommands.push(command);
          done();
        });
      },
    });
    assert.deepEqual(commands.sort(), executedCommands.sort());
  });

  it("no command executed.", async () => {
    const commands = [];
    const executedCommands = [];
    const lock = new AsyncLock();

    const synchronizer = new SimpleSynchronizer({
      commands,
      batchSize: 2,
    });
    await synchronizer.execute({
      executor: async (command: string) => {
        lock.acquire("lock", (done: () => void) => {
          executedCommands.push(command);
          done();
        });
      },
    });
    assert.deepEqual(commands.sort(), executedCommands.sort());
  });
});

describe("custom synchronizer test.", () => {
  const context = "context";
  let receivedContext = "";

  const synchronizer = new CustomSynchronizer<string>({
    synchronizer: async (context: string) => {
      receivedContext = context;
    },
  });
  synchronizer.execute({ context });
  waitUntil({
    fn: () => {
      return receivedContext !== "";
    },
  });

  it("synchronizer executed.", () => {
    assert.notEqual(receivedContext, "");
  });

  it("synchronizer use the right context.", () => {
    assert.equal(receivedContext, context);
  });
});
