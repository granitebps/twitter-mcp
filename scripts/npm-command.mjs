/**
 * Build a cross-platform npm invocation without relying on an npm or npm.cmd
 * executable shim.
 *
 * @param {string[]} args
 * @param {Readonly<Record<string, string | undefined>>} [env]
 * @returns {{ command: string, args: string[] }}
 */
export function npmCommand(args, env = process.env) {
  const npmExecPath = env.npm_execpath;
  if (!npmExecPath) throw new Error("npm_execpath is required; run this check through npm");
  return { command: process.execPath, args: [npmExecPath, ...args] };
}
