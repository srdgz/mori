export type FormState = {
  status: "idle" | "ok" | "error";
  code?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
  at?: number;
};

export type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;

export const IDLE: FormState = { status: "idle" };
