module.exports = {
  types: [
    { value: "feat", name: "feat:     A new feature" },
    { value: "fix", name: "fix:      A bug fix" },
    { value: "docs", name: "docs:     Documentation only changes" },
    {
      value: "refactor",
      name: "refactor: A code change that neither fixes a bug nor adds a feature (formatting, performance improvement, etc)",
    },
    {
      value: "test",
      name: "test:     Adding missing tests or correcting existing tests",
    },
    {
      value: "build",
      name: "build:    Changes that affect the build system or external dependencies (npm, webpack, typescript)",
    },
    {
      value: "ci",
      name: "ci:       Changes to our CI configuration files and scripts (NOTE: Does not bump the version",
    },
    {
      value: "chore",
      name: "chore:    Other changes that don't modify src or test files",
    },
    { value: "revert", name: "revert:   Reverts a previous commit" },
  ],
  allowTicketNumber: true,
  isTicketNumberRequired: true,
  ticketNumberPrefix: "#",
  skipQuestions: ["scope", "body", "breaking", "footer"],
};
