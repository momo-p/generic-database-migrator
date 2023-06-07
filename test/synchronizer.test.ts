import * as assert from "assert";
import AsyncLock = require("async-lock");
import { waitUntil } from "./utils";
import {
  SimpleSynchronizer,
  CustomSynchronizer,
  MixedSynchronizer,
} from "../src";

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

describe("mixed synchronizer test.", () => {
  const expectedCommands = [
    "1.1",
    "1.2",
    "1.3",
    "1.4",
    "1.5",
    "2.1",
    "2.2",
    "3.1",
    "3.2",
    "3.3",
    "3.4",
    "3.5",
  ];
  const context = "context";
  const executedCommands = [];
  let receivedContext = "";
  const lock = new AsyncLock();
  const appendExecutedCommand = async (command: string) => {
    lock.acquire("lock", (done: () => void) => {
      executedCommands.push(command);
      done();
    });
  };

  const synchronizer = new MixedSynchronizer<string>({
    synchronizers: [
      new SimpleSynchronizer({
        commands: expectedCommands.filter((command) =>
          command.startsWith("1.")
        ),
      }),
      new CustomSynchronizer<string>({
        synchronizer: async () => {
          for (const command of expectedCommands.filter((command) =>
            command.startsWith("2.")
          )) {
            await appendExecutedCommand(command);
          }
        },
      }),
      new SimpleSynchronizer({
        commands: expectedCommands.filter((command) =>
          command.startsWith("3.")
        ),
      }),
      new CustomSynchronizer<string>({
        synchronizer: async (context: string) => {
          receivedContext = context;
        },
      }),
    ],
  });
  synchronizer.execute({
    executor: appendExecutedCommand,
    context,
  });
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

  it("synchronizers are executed sequentially by priority.", () => {
    const getPriority = (command: string) => parseInt(command.split(".")[0]);
    for (let i = 0; i < executedCommands.length - 1; ++i) {
      assert(
        getPriority(executedCommands[i]) <= getPriority(executedCommands[i + 1])
      );
    }
  });

  it("all the commands executed.", () => {
    assert.deepEqual(executedCommands.sort(), expectedCommands.sort());
  });
});
