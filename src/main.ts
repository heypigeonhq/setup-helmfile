import * as core from "@actions/core";

import * as helmfile from "./helmfile";

async function run(): Promise<void> {
  const requestedVersion = core.getInput("version");

  const token = core.getInput("token");

  const skipInit = core.getInput("skip-init");

  core.info(`Requested version of Helmfile is "${requestedVersion}"`);

  const version = await helmfile.getVersion(requestedVersion, token);

  core.info(`Using version v${version}`);

  core.info("Fetching binary...");

  const binaryPath = await helmfile.fetch(version);

  core.info("Installing binary...");

  const installPath = await helmfile.install(binaryPath);

  if (skipInit !== "true") {
    core.info("Installing additional tools needed by Helmfile...");

    await helmfile.initialize(version, installPath);
  }

  core.info("Helmfile is ready to use");
}

run().catch(core.setFailed);
