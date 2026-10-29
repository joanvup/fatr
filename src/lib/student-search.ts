export type StudentSearchOption = {
  id: string;
  name: string;
  documentId: string;
  courseName: string;
};

export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function studentOptionLabel(student: StudentSearchOption): string {
  return `${student.name} · ${student.documentId} · ${student.courseName}`;
}

export function filterStudents<T extends StudentSearchOption>(students: T[], query: string): T[] {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return students;
  return students.filter((student) => {
    const haystack = normalizeSearch(`${student.name} ${student.documentId} ${student.courseName}`);
    return tokens.every((token) => haystack.includes(token));
  });
}
