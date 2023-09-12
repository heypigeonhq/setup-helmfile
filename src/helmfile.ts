import crypto from "crypto";
import fs from "fs";
import fsPromises from "fs/promises";
import os from "os";
import path from "path";
import streamPromises from "stream/promises";

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as toolCache from "@actions/tool-cache";

import * as github from "./github";
import * as host from "./host";

/**
 * Fetch the Helmfile binary for the given version.
 *
 * @param version version of the Helmfile release archive to fetch
 */
export async function fetch(version: string): Promise<string> {
  const archiveFile = await fetchArchive(version);

  const archiveFilename = getArchiveFilename(version);

  const checksumsFile = await fetchChecksums(version);

  const checksumHash = await createChecksumHash(archiveFile);

  const checksum = `${checksumHash}  ${archiveFilename}`;

  const checksums = await fsPromises.readFile(checksumsFile, "utf8");

  if (!checksums.includes(checksum)) {
    throw new Error(
      `Failed to fetch Helmfile v${version}: unexpected checksum for ${archiveFilename}`,
    );
  }

  const binaryDir = await toolCache.extractTar(archiveFile);

  return `${binaryDir}/helmfile`;
}

async function fetchArchive(version: string): Promise<string> {
  return await fetchTool(
    "helmfileArchive",
    version,
    getArchiveFilename(version),
  );
}

async function fetchChecksums(version: string): Promise<string> {
  return await fetchTool(
    "helmfileChecksums",
    version,
    getChecksumsFilename(version),
  );
}

async function fetchTool(
  toolName: string,
  version: string,
  filename: string,
): Promise<string> {
  const arch = host.getArch();

  let cachePath = toolCache.find(toolName, version, arch);

  if (!cachePath) {
    const url = `https://github.com/helmfile/helmfile/releases/download/v${version}/${filename}`;

    const filePath = await toolCache.downloadTool(url);

    cachePath = await toolCache.cacheFile(
      filePath,
      filename,
      toolName,
      version,
      arch,
    );
  }

  return `${cachePath}/${filename}`;
}

async function createChecksumHash(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");

  const fileStream = fs.createReadStream(filePath);

  fileStream.pipe(hash);

  await streamPromises.finished(fileStream);

  return hash.digest("hex");
}

/**
 * Returns the filename of the Helmfile release archive for the given version.
 *
 * @param version version of Helmfile to get the filename for
 */
export function getArchiveFilename(version: string) {
  const arch = host.getArch();

  const platform = host.getPlatform();

  return `helmfile_${version}_${platform}_${arch}.tar.gz`;
}

/**
 * Returns the filename of the Helmfile checksums file for the given version.
 *
 * @param version version of Helmfile to get the filename for
 */
export function getChecksumsFilename(version: string) {
  return `helmfile_${version}_checksums.txt`;
}

/**
 * Get the version of Helmfile.
 *
 * If the version requested is "latest" then the most recent released version
 * of Helmfile will be returned. Otherwise, return `requestedVersion`.
 *
 * @param requestedVersion version of Helmfile requested
 */
export async function getVersion(requestedVersion: string): Promise<string> {
  let version = requestedVersion;

  if (version === "latest") {
    const release = await github.getLatestRelease("helmfile/helmfile");

    version = release.tagName.replace(/^v/, "");
  }

  return version;
}

/**
 * Install additional tools needed by Helmfile.
 *
 * Same as running `helmfile init --force`.
 *
 * Attempts to speed up the initialization process by restoring the tools from
 * the cache if possible.
 *
 * @param version version of Helmfile
 *
 * @param binaryPath path to the Helmfile binary
 */
export async function initialize(
  version: string,
  binaryPath: string,
): Promise<void> {
  const arch = host.getArch();

  const toolName = "helmPlugins";

  const cachePath = toolCache.find(toolName, version, arch);

  const pluginsPath = path.join(
    os.homedir(),
    ".local",
    "share",
    "helm",
    "plugins",
  );

  if (cachePath) {
    await fsPromises.mkdir(pluginsPath, { recursive: true });

    await fsPromises.cp(cachePath, pluginsPath, { recursive: true });
  }

  await exec.exec(binaryPath, ["init", "--force"], {
    silent: !core.isDebug(),
  });

  await toolCache.cacheDir(pluginsPath, toolName, version, arch);
}

/**
 * Install the Helmfile binary.
 *
 * Copies the Helmfile binary to `/usr/local/bin/helmfile` and modifies the
 * files permissions so that it is executable.
 *
 * @param binaryPath path to the Helmfile binary
 */
export async function install(binaryPath: string): Promise<string> {
  const installPath = "/usr/local/bin/helmfile";

  await fsPromises.chmod(binaryPath, 0o500);
  await fsPromises.copyFile(binaryPath, installPath);

  return installPath;
}
