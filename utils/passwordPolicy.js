// utils/passwordPolicy.js
// Keep in sync with the frontend copy in src/utils/passwordPolicy.ts.

// At least 8 characters, with at least one uppercase letter, one lowercase letter and one digit.
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.";

export const isValidPassword = (password) =>
  typeof password === "string" && PASSWORD_REGEX.test(password);
