import { describe, expect, it } from "vitest";
import { validateContactMessage, validateField, type ContactMessageInput } from "./contact-message";

const valid: ContactMessageInput = {
  topic: "Prensa",
  name: "  Lucía  ",
  email: " Lucia@Example.COM ",
  message: "  Queremos hacer un reportaje.  ",
  consent: true,
};

describe("validateField", () => {
  it("requires a name that is not only spaces", () => {
    expect(validateField("name", { ...valid, name: "   " })).toBe("required");
    expect(validateField("name", valid)).toBeNull();
  });

  it("requires a well-formed email", () => {
    expect(validateField("email", { ...valid, email: "" })).toBe("required");
    expect(validateField("email", { ...valid, email: "lucia@example" })).toBe("email");
    expect(validateField("email", { ...valid, email: "lucia example.com" })).toBe("email");
    expect(validateField("email", valid)).toBeNull();
  });

  it("requires a message of at least ten characters", () => {
    expect(validateField("message", { ...valid, message: " " })).toBe("required");
    expect(validateField("message", { ...valid, message: "Hola MŌRI" })).toBe("short");
    expect(validateField("message", { ...valid, message: "Hola, MŌRI" })).toBeNull();
  });

  it("requires consent", () => {
    expect(validateField("consent", { ...valid, consent: false })).toBe("consent");
    expect(validateField("consent", valid)).toBeNull();
  });
});

describe("validateContactMessage", () => {
  it("returns every failing field at once", () => {
    const result = validateContactMessage({ topic: "Hola", name: "", email: "x", message: "", consent: false });
    expect(result).toEqual({ ok: false, errors: { name: "required", email: "email", message: "required", consent: "consent" } });
  });

  it("returns a normalised message when everything is valid", () => {
    expect(validateContactMessage(valid)).toEqual({
      ok: true,
      value: { topic: "Prensa", name: "Lucía", email: "lucia@example.com", message: "Queremos hacer un reportaje.", consent: true },
    });
  });
});
