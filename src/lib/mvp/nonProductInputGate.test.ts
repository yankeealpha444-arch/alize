import { describe, expect, it } from "vitest";
import { isNonProductInput, tryNonProductInputGate } from "@/lib/mvp/nonProductInputGate";

describe("isNonProductInput", () => {
  it("blocks SQL-like text", () => {
    expect(
      isNonProductInput(`CREATE TABLE users (id uuid PRIMARY KEY);\nINSERT INTO users VALUES (1);`),
    ).toBe(true);
    expect(isNonProductInput(`select * from products where jsonb ? 'tags'`)).toBe(true);
  });

  it("blocks code-like text", () => {
    expect(isNonProductInput(`import React from "react";\nexport const x = 1;`)).toBe(true);
    expect(isNonProductInput(`const foo = () => {\n  return null;\n};`)).toBe(true);
    expect(isNonProductInput(`interface Props { name: string }`)).toBe(true);
    expect(isNonProductInput(`class Foo { }`)).toBe(true);
  });

  it("blocks env/config", () => {
    expect(isNonProductInput(`VITE_API_URL=https://x.com\nSUPABASE_KEY=abc`)).toBe(true);
    expect(isNonProductInput(`process.env.API_KEY`)).toBe(true);
  });

  it("allows real startup ideas", () => {
    expect(
      isNonProductInput(
        "Build a loan repayment calculator with loan amount, interest rate, loan term, and monthly repayment output",
      ),
    ).toBe(false);
    expect(
      isNonProductInput(
        "A B2B SaaS for teams to track runway and burn — simple dashboard and weekly email digest.",
      ),
    ).toBe(false);
  });

  it("does not block classification / natural language (regression)", () => {
    expect(isNonProductInput("Build a classification tool for support tickets")).toBe(false);
  });

  it("tryNonProductInputGate returns envelope when blocked", () => {
    const r = tryNonProductInputGate("CREATE TABLE x();");
    expect(r?.type).toBe("blocked_input");
    expect(r?.message).toMatch(/SQL or code/i);
    expect(tryNonProductInputGate("A simple CRM for dentists")).toBeNull();
  });
});
