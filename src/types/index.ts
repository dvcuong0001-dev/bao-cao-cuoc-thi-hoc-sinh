export type TeacherRole = "SUPER_ADMIN" | "ADMIN" | "TEACHER";
export type ViewerRole = "HOMEROOM" | "VIEWER";

export type MeDto =
  | { kind: "teacher"; id: string; name: string; role: TeacherRole; mustChangePin: boolean }
  | { kind: "student"; id: string; name: string; classId: string; className: string; mustChangePin: boolean };

/** Trạng thái của 1 học sinh với 1 cuộc thi */
export type CellStatus = "ON_TIME" | "LATE" | "PENDING" | "MISSING" | "NOT_ASSIGNED";

export interface ClassDto {
  id: string;
  name: string;
  grade: number;
  academicYear: string;
  isActive: boolean;
  studentCount: number;
  viewers: { teacherId: string; name: string; role: ViewerRole }[];
  myAccess?: "manage" | "view";
}

export interface StudentRowDto {
  id: string;
  name: string;
  code: string | null;
  dob: string | null;
  isActive: boolean;
  mustChangePin: boolean;
  lockedMinutes: number;
}

export interface TeacherDto {
  id: string;
  name: string;
  phone: string | null;
  role: TeacherRole;
  isActive: boolean;
  mustChangePin: boolean;
  lockedMinutes: number;
  classes: { classId: string; className: string; role: ViewerRole }[];
}

export interface CompetitionDto {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  deadline: string;
  status: "ACTIVE" | "CLOSED_EARLY";
  allowLateSubmission: boolean;
  academicYear: string;
  isArchived: boolean;
  classIds: string[];
  classNames: string[];
  createdAt: string;
}

export interface MySubmissionDto {
  id: string;
  status: "ON_TIME" | "LATE";
  submittedAt: string;
  note: string | null;
  hasImage: boolean;
}

export interface StudentCompetitionDto extends CompetitionDto {
  mySubmission: MySubmissionDto | null;
}

export interface PinSlip {
  name: string;
  className: string;
  pin: string;
  dob?: string | null;
}

export interface ClassReportDto {
  classRoom: { id: string; name: string; academicYear: string };
  access: "manage" | "view";
  competitions: { id: string; title: string; deadline: string; status: string; isArchived: boolean }[];
  students: StudentRowDto[];
  /** cells[studentId][competitionId] */
  cells: Record<string, Record<string, { status: CellStatus; submissionId?: string; submittedAt?: string; hasImage?: boolean; note?: string | null }>>;
}

export interface SchoolReportRow {
  classId: string;
  className: string;
  grade: number;
  studentCount: number;
  assigned: number;
  onTime: number;
  late: number;
  missing: number;
}

export interface SchoolReportDto {
  academicYear: string;
  competitionId: string | null;
  competitions: { id: string; title: string; deadline: string }[];
  rows: SchoolReportRow[];
}
