export default {
  extends: ["@commitlint/config-conventional"],
  ignores: [(message) => /^chore\(deps(-\S+)?\): bump/m.test(message)],
};
