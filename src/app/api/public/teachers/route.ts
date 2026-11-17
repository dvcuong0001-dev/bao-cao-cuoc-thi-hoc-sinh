import { db } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { compareVietnameseName } from "@/lib/names";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const teachers = await db.teacher.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  teachers.sort((a, b) => compareVietnameseName(a.name, b.name));
  return ok({ teachers });
});
