import { db } from "@/lib/db";
import { handle, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Công khai cho màn hình đăng nhập: chỉ trả tên lớp và khối */
export const GET = handle(async () => {
  const classes = await db.classRoom.findMany({
    where: { isActive: true },
    select: { id: true, name: true, grade: true },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
  });
  return ok({ classes });
});
