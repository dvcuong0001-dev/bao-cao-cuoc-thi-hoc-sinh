import { NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Đọc JSON body và kiểm tra bằng zod; ném HttpError 400 nếu sai */
export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  const raw = await req.json().catch(() => null);
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(400, firstZodMessage(result.error));
  }
  return result.data;
}

export function firstZodMessage(error: ZodError): string {
  return error.issues[0]?.message || "Dữ liệu không hợp lệ";
}

/** Bọc route handler: chuyển HttpError thành phản hồi JSON, log lỗi khác */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.status, err.message);
      console.error(err);
      return fail(500, "Đã xảy ra lỗi máy chủ, vui lòng thử lại");
    }
  };
}
