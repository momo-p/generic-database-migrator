import * as assert from "assert";
import AsyncLock = require("async-lock");
import { waitUntil } from "./utils";
import {
  Migrator,
  SimpleSynchronizer,
  CustomSynchronizer,
  MixedSynchronizer,
} from "../src";

describe("fresh migrate a database with no data.", () => {
  const expectedCommands = [
    "a.1.1",
    "a.1.2",
    "b.1.1",
    "b.2.1",
    "b.2.2",
    "b.2.3",
    "b.2.4",
    "b.2.5",
    "c.1.1",
    "c.2.1",
    "c.3.1",
    "c.4.1",
    "c.5.1",
  ];
  const context = "context";
  const executedCommands = [];
  let receivedContextA = "",
    receivedContextB = "",
    receivedContextC = "";
  const lock = new AsyncLock();
  const appendExecutedCommand = async (command: string) => {
    lock.acquire("lock", (done: () => void) => {
      executedCommands.push(command);
      done();
    });
  };
  const featureMark = {
    a: 0,
    b: 0,
    c: 0,
  };

  const migrator = new Migrator<string>({
    executor: appendExecutedCommand,
    context: context,
    marker: {
      mark: async ({ feature, version }) => {
        featureMark[feature] = version;
      },
      fetch: async ({ feature }) => {
        return featureMark[feature];
      },
    },
    synchronizers: {
      a: [
        new MixedSynchronizer<string>({
          synchronizers: [
            new SimpleSynchronizer({
              commands: ["a.1.1", "a.1.2"],
            }),
            new CustomSynchronizer<string>({
              synchronizer: async (context: string) => {
                receivedContextA = context;
              },
            }),
          ],
        }),
      ],
      b: [
        new SimpleSynchronizer({
          commands: ["b.1.1"],
        }),
        new MixedSynchronizer<string>({
          synchronizers: [
            new SimpleSynchronizer({
              commands: ["b.2.1", "b.2.2", "b.2.3", "b.2.4", "b.2.5"],
            }),
            new CustomSynchronizer<string>({
              synchronizer: async (context: string) => {
                receivedContextB = context;
              },
            }),
          ],
        }),
      ],
      c: [
        new SimpleSynchronizer({
          commands: ["c.1.1"],
        }),
        new SimpleSynchronizer({
          commands: ["c.2.1"],
        }),
        new SimpleSynchronizer({
          commands: ["c.3.1"],
        }),
        new SimpleSynchronizer({
          commands: ["c.4.1"],
        }),
        new MixedSynchronizer<string>({
          synchronizers: [
            new SimpleSynchronizer({
              commands: ["c.5.1"],
            }),
            new CustomSynchronizer<string>({
              synchronizer: async (context: string) => {
                receivedContextC = context;
              },
            }),
          ],
        }),
      ],
    },
  });

  migrator.execute();
  waitUntil({
    fn: () => {
      return (
        receivedContextA !== "" &&
        receivedContextB !== "" &&
        receivedContextC !== ""
      );
    },
  });

  it("synchronizer executed.", () => {
    assert.notEqual(receivedContextA, "");
    assert.notEqual(receivedContextB, "");
    assert.notEqual(receivedContextC, "");
  });

  it("synchronizer use the right context.", () => {
    assert.equal(receivedContextA, context);
    assert.equal(receivedContextB, context);
    assert.equal(receivedContextC, context);
  });

  it("synchronizers are executed sequentially by priority.", () => {
    const commandsGroup = {
      a: [],
      b: [],
      c: [],
    };
    executedCommands.map((command) => {
      commandsGroup[command.split(".")[0]].push(command);
    });
    assert.equal(commandsGroup.a.length, 2);
    assert.equal(commandsGroup.b.length, 6);
    assert.equal(commandsGroup.c.length, 5);

    const getPriority = (command: string) => parseInt(command.split(".")[1]);
    for (const group of ["a", "b", "c"]) {
      for (let i = 0; i < commandsGroup[group].length - 1; ++i) {
        assert(
          getPriority(commandsGroup[group][i]) <=
            getPriority(commandsGroup[group][i + 1])
        );
      }
    }
  });

  it("all the commands executed.", () => {
    assert.deepEqual(executedCommands.sort(), expectedCommands.sort());
  });
});

describe("old database that need to be upgrade.", () => {
  const expectedCommands = [
    "b.2.1",
    "b.2.2",
    "b.2.3",
    "b.2.4",
    "b.2.5",
    "c.3.1",
    "c.4.1",
    "c.5.1",
  ];
  const context = "context";
  const executedCommands = [];
  let receivedContextA = "",
    receivedContextB = "",
    receivedContextC = "";
  const lock = new AsyncLock();
  const appendExecutedCommand = async (command: string) => {
    lock.acquire("lock", (done: () => void) => {
      executedCommands.push(command);
      done();
    });
  };
  const featureMark = {
    a: 1,
    b: 1,
    c: 2,
  };

  const migrator = new Migrator<string>({
    executor: appendExecutedCommand,
    context: context,
    marker: {
      mark: async ({ feature, version }) => {
        featureMark[feature] = version;
      },
      fetch: async ({ feature }) => {
        return featureMark[feature];
      },
    },
    synchronizers: {
      a: [
        new MixedSynchronizer<string>({
          synchronizers: [
            new SimpleSynchronizer({
              commands: ["a.1.1", "a.1.2"],
            }),
            new CustomSynchronizer<string>({
              synchronizer: async (context: string) => {
                receivedContextA = context;
              },
            }),
          ],
        }),
      ],
      b: [
        new SimpleSynchronizer({
          commands: ["b.1.1"],
        }),
        new MixedSynchronizer<string>({
          synchronizers: [
            new SimpleSynchronizer({
              commands: ["b.2.1", "b.2.2", "b.2.3", "b.2.4", "b.2.5"],
            }),
            new CustomSynchronizer<string>({
              synchronizer: async (context: string) => {
                receivedContextB = context;
              },
            }),
          ],
        }),
      ],
      c: [
        new SimpleSynchronizer({
          commands: ["c.1.1"],
        }),
        new SimpleSynchronizer({
          commands: ["c.2.1"],
        }),
        new SimpleSynchronizer({
          commands: ["c.3.1"],
        }),
        new SimpleSynchronizer({
          commands: ["c.4.1"],
        }),
        new MixedSynchronizer<string>({
          synchronizers: [
            new SimpleSynchronizer({
              commands: ["c.5.1"],
            }),
            new CustomSynchronizer<string>({
              synchronizer: async (context: string) => {
                receivedContextC = context;
              },
            }),
          ],
        }),
      ],
    },
  });

  migrator.execute();
  waitUntil({
    fn: () => {
      return (
        receivedContextA !== "" &&
        receivedContextB !== "" &&
        receivedContextC !== ""
      );
    },
  });

  it("part of synchronizer executed.", () => {
    assert.equal(receivedContextA, "");
    assert.notEqual(receivedContextB, "");
    assert.notEqual(receivedContextC, "");
  });

  it("synchronizer use the right context.", () => {
    assert.equal(receivedContextB, context);
    assert.equal(receivedContextC, context);
  });

  it("synchronizers are executed sequentially by priority.", () => {
    const commandsGroup = {
      a: [],
      b: [],
      c: [],
    };
    executedCommands.map((command) => {
      commandsGroup[command.split(".")[0]].push(command);
    });
    assert.equal(commandsGroup.a.length, 0);
    assert.equal(commandsGroup.b.length, 5);
    assert.equal(commandsGroup.c.length, 3);

    const getPriority = (command: string) => parseInt(command.split(".")[1]);
    for (const group of ["a", "b", "c"]) {
      for (let i = 0; i < commandsGroup[group].length - 1; ++i) {
        assert(
          getPriority(commandsGroup[group][i]) <=
            getPriority(commandsGroup[group][i + 1])
        );
      }
    }
  });

  it("all the expected commands executed.", () => {
    assert.deepEqual(executedCommands.sort(), expectedCommands.sort());
  });
});

describe("no synchronizer executed.", () => {
  const expectedCommands = [];
  const context = "context";
  const executedCommands = [];
  let receivedContextA = "",
    receivedContextB = "",
    receivedContextC = "";
  const lock = new AsyncLock();
  const appendExecutedCommand = async (command: string) => {
    lock.acquire("lock", (done: () => void) => {
      executedCommands.push(command);
      done();
    });
  };
  const featureMark = {
    a: 1,
    b: 2,
    c: 5,
  };

  const migrator = new Migrator<string>({
    executor: appendExecutedCommand,
    context: context,
    marker: {
      mark: async ({ feature, version }) => {
        featureMark[feature] = version;
      },
      fetch: async ({ feature }) => {
        return featureMark[feature];
      },
    },
    synchronizers: {
      a: [
        new MixedSynchronizer<string>({
          synchronizers: [
            new SimpleSynchronizer({
              commands: ["a.1.1", "a.1.2"],
            }),
            new CustomSynchronizer<string>({
              synchronizer: async (context: string) => {
                receivedContextA = context;
              },
            }),
          ],
        }),
      ],
      b: [
        new SimpleSynchronizer({
          commands: ["b.1.1"],
        }),
        new MixedSynchronizer<string>({
          synchronizers: [
            new SimpleSynchronizer({
              commands: ["b.2.1", "b.2.2", "b.2.3", "b.2.4", "b.2.5"],
            }),
            new CustomSynchronizer<string>({
              synchronizer: async (context: string) => {
                receivedContextB = context;
              },
            }),
          ],
        }),
      ],
      c: [
        new SimpleSynchronizer({
          commands: ["c.1.1"],
        }),
        new SimpleSynchronizer({
          commands: ["c.2.1"],
        }),
        new SimpleSynchronizer({
          commands: ["c.3.1"],
        }),
        new SimpleSynchronizer({
          commands: ["c.4.1"],
        }),
        new MixedSynchronizer<string>({
          synchronizers: [
            new SimpleSynchronizer({
              commands: ["c.5.1"],
            }),
            new CustomSynchronizer<string>({
              synchronizer: async (context: string) => {
                receivedContextC = context;
              },
            }),
          ],
        }),
      ],
    },
  });

  migrator.execute();
  waitUntil({
    fn: () => {
      return (
        receivedContextA !== "" &&
        receivedContextB !== "" &&
        receivedContextC !== ""
      );
    },
  });

  it("none of the synchronizer executed.", () => {
    assert.equal(receivedContextA, "");
    assert.equal(receivedContextB, "");
    assert.equal(receivedContextC, "");
  });

  it("synchronizers are executed sequentially by priority.", () => {
    const commandsGroup = {
      a: [],
      b: [],
      c: [],
    };
    executedCommands.map((command) => {
      commandsGroup[command.split(".")[0]].push(command);
    });
    assert.equal(commandsGroup.a.length, 0);
    assert.equal(commandsGroup.b.length, 0);
    assert.equal(commandsGroup.c.length, 0);

    const getPriority = (command: string) => parseInt(command.split(".")[1]);
    for (const group of ["a", "b", "c"]) {
      for (let i = 0; i < commandsGroup[group].length - 1; ++i) {
        assert(
          getPriority(commandsGroup[group][i]) <=
            getPriority(commandsGroup[group][i + 1])
        );
      }
    }
  });

  it("all the expected commands executed.", () => {
    assert.deepEqual(executedCommands.sort(), expectedCommands.sort());
  });
});
