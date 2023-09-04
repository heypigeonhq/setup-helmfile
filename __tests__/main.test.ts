import path from "path";

import { Act } from "@kie/act-js";
import { MockGithub } from "@kie/mock-github";

let github: MockGithub;

beforeEach(async () => {
  github = new MockGithub({
    repo: {
      setupHelmfile: {
        files: [
          {
            dest: "dist/",
            src: path.join(__dirname, "..", "dist/"),
          },
        ],
      },
    },
  });

  await github.setup();
});

afterEach(async () => {
  await github.teardown();
});

test("it works", async () => {
  const act = new Act(github.repo.getPath("setupHelmfile"));

  const result = await act.runEvent("push", { logFile: "act.log" });

  expect(result).toStrictEqual([]);
});
