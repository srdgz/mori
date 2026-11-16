import { describe, expect, it } from "vitest";
import { renderEmail } from "./templates";

describe("renderEmail", () => {
  it("renders the verification email in the user's language with the link", () => {
    const email = renderEmail({
      kind: "verify_email",
      to: "ana@example.com",
      name: "Ana",
      locale: "es",
      url: "https://x.test/v?token=1&a=2",
    });
    expect(email.subject).toBe("Confirma tu email · MŌRI");
    expect(email.html).toContain('href="https://x.test/v?token=1&amp;a=2"');
    expect(email.text).toContain("Confirmar email: https://x.test/v?token=1&a=2");
  });

  it("escapes the name", () => {
    const email = renderEmail({ kind: "reset_password", to: "a@b.c", name: "<script>", locale: "en", url: "https://x.test" });
    expect(email.html).toContain("Hi &lt;script&gt;");
    expect(email.html).not.toContain("<script>");
  });

  it("renders a notice without a button", () => {
    const email = renderEmail({ kind: "password_changed", to: "a@b.c", name: "Ana", locale: "en" });
    expect(email.subject).toBe("Your password was changed · MŌRI");
    expect(email.html).not.toContain("<a ");
  });
});
