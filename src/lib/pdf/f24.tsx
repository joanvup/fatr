import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatDate } from "@/lib/dates";
import { PdfFooter, PdfHeader } from "@/lib/pdf/header";
import { PDF_COLORS, styles } from "@/lib/pdf/theme";
import { chunk } from "@/lib/pdf/text";
import type { PdfHeaderInfo } from "@/lib/pdf/types";

export type F24Cell = {
  therapyId: string;
  assigned: boolean;
  therapistName: string | null;
  sessions: number;
  lastDate: string | null;
};

export type F24Row = {
  studentName: string;
  documentId: string;
  courseName: string;
  cells: F24Cell[];
};

export type F24DocumentData = {
  header: PdfHeaderInfo;
  courseLabel: string;
  from: string;
  to: string;
  therapies: { id: string; key: string; nameEs: string }[];
  rows: F24Row[];
  rowsPerPage: number;
};

const LEFT = { student: 164, document: 66, course: 80, total: 48 };
const ROW_HEIGHT = 52;

const THERAPY_LABELS: Record<string, string> = {
  fonoaudiologia: "FONOAUDIOLOGÍA\n(Terapia de lenguaje, articulación)",
  psicologia: "PSICOLOGÍA\n(Emocional o de familia)",
  ocupacional: "T. OCUPACIONAL\n(Motricidad, integración sensorial)",
  conducta: "MOLDEAMIENTO\nDE CONDUCTA",
};

function therapyLabel(key: string, nameEs: string) {
  return THERAPY_LABELS[key] ?? nameEs.toUpperCase();
}

export function F24Document({ data }: { data: F24DocumentData }) {
  const { header, therapies, rows, rowsPerPage } = data;
  const pages = chunk(rows, rowsPerPage);
  const totals = therapies.map((therapy) => ({
    therapyId: therapy.id,
    sessions: rows.reduce((sum, row) => {
      const cell = row.cells.find((item) => item.therapyId === therapy.id);
      return sum + (cell?.sessions ?? 0);
    }, 0),
  }));
  const grandTotal = rows.reduce(
    (sum, row) => sum + row.cells.reduce((rowSum, cell) => rowSum + cell.sessions, 0),
    0,
  );

  return (
    <Document
      title={`${header.code} · Relación de atención`}
      author={header.institution}
      subject="Attention record"
      creator="FATR"
    >
      {pages.map((pageRows, pageIndex) => (
        <Page key={pageIndex} size="A4" orientation="landscape" style={styles.page}>
          <PdfHeader
            logo={header.logo}
            institution={header.institution}
            code={header.code}
            version={header.version}
            validity={header.validity}
            titleEs="Relación de atención por estudiante"
            titleEn="Student attention record"
          />

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              Curso: <Text style={styles.metaStrong}>{data.courseLabel}</Text>
            </Text>
            <Text style={styles.metaText}>
              Rango: <Text style={styles.metaStrong}>{formatDate(data.from)}</Text> a{" "}
              <Text style={styles.metaStrong}>{formatDate(data.to)}</Text> · Total sesiones:{" "}
              <Text style={styles.metaStrong}>{grandTotal}</Text>
            </Text>
          </View>

          <View style={styles.table}>
            <View style={[styles.headRow, { height: 42 }]}>
              <View style={[styles.th, { width: LEFT.student }]}>
                <Text style={styles.thText}>ESTUDIANTE{"\n"}Student</Text>
              </View>
              <View style={[styles.th, { width: LEFT.document }]}>
                <Text style={styles.thText}>DOCUMENTO{"\n"}ID</Text>
              </View>
              <View style={[styles.th, { width: LEFT.course }]}>
                <Text style={styles.thText}>CURSO{"\n"}Class</Text>
              </View>
              <View style={[styles.th, { width: LEFT.total }]}>
                <Text style={styles.thText}>TOTAL{"\n"}SESIONES</Text>
              </View>
              {therapies.map((therapy) => (
                <View key={therapy.id} style={{ flex: 1, borderRightWidth: 0.5, borderRightColor: PDF_COLORS.grid }}>
                  <View style={{ height: 25, justifyContent: "center", paddingHorizontal: 2, borderBottomWidth: 0.5, borderBottomColor: PDF_COLORS.grid }}>
                    <Text style={[styles.thText, { fontSize: 4.9 }]}>{therapyLabel(therapy.key, therapy.nameEs)}</Text>
                  </View>
                  <View style={{ flex: 1, flexDirection: "row" }}>
                    <View style={{ flex: 1, justifyContent: "center", borderRightWidth: 0.5, borderRightColor: PDF_COLORS.grid }}>
                      <Text style={styles.thText}>No.</Text>
                    </View>
                    <View style={{ flex: 1, justifyContent: "center" }}>
                      <Text style={styles.thText}>Última</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {pageRows.map((row) => (
              <View key={row.documentId} style={styles.row} wrap={false}>
                <View style={[styles.td, { width: LEFT.student, height: ROW_HEIGHT }]}>
                  <Text style={{ fontSize: 6.8, fontWeight: "bold" }}>
                    {row.studentName}
                  </Text>
                </View>
                <View style={[styles.td, { width: LEFT.document, height: ROW_HEIGHT }]}>
                  <Text style={[styles.tdText, styles.center]}>{row.documentId}</Text>
                </View>
                <View style={[styles.td, { width: LEFT.course, height: ROW_HEIGHT }]}>
                  <Text style={[styles.tdText, styles.center]}>
                    {row.courseName}
                  </Text>
                </View>
                <View style={[styles.td, { width: LEFT.total, height: ROW_HEIGHT, alignItems: "center" }]}>
                  <Text style={{ fontSize: 10, fontWeight: "bold" }}>
                    {row.cells.reduce((sum, cell) => sum + cell.sessions, 0)}
                  </Text>
                </View>
                {therapies.map((therapy) => {
                  const cell = row.cells.find((item) => item.therapyId === therapy.id);
                  return (
                    <View
                      key={therapy.id}
                      style={{
                        flex: 1,
                        height: ROW_HEIGHT,
                        flexDirection: "row",
                        borderRightWidth: 0.5,
                        borderRightColor: PDF_COLORS.grid,
                      }}
                    >
                      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", borderRightWidth: 0.5, borderRightColor: PDF_COLORS.grid, paddingHorizontal: 1 }}>
                        <Text style={{ fontSize: 9.5, fontWeight: "bold", color: cell?.sessions ? PDF_COLORS.brand : "#9ca3af" }}>
                          {cell?.sessions ?? 0}
                        </Text>
                        <Text style={{ fontSize: 4.3, color: cell?.assigned ? "#166534" : "#9ca3af", marginTop: 1 }}>
                          {cell?.assigned ? "Asignada" : "Sin asignar"}
                        </Text>
                        {cell?.therapistName ? (
                          <Text style={{ fontSize: 3.9, color: PDF_COLORS.muted, marginTop: 0.5 }}>
                            {cell.therapistName}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 1 }}>
                        <Text style={{ fontSize: 5.1, textAlign: "center" }}>{formatDate(cell?.lastDate)}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}

            {Array.from({ length: Math.max(0, rowsPerPage - pageRows.length) }).map((_, index) => (
              <View key={`blank-${index}`} style={styles.row}>
                <View style={[styles.td, { width: LEFT.student, height: ROW_HEIGHT }]} />
                <View style={[styles.td, { width: LEFT.document, height: ROW_HEIGHT }]} />
                <View style={[styles.td, { width: LEFT.course, height: ROW_HEIGHT }]} />
                <View style={[styles.td, { width: LEFT.total, height: ROW_HEIGHT }]} />
                {therapies.map((therapy) => (
                  <View key={therapy.id} style={{ flex: 1, height: ROW_HEIGHT, flexDirection: "row", borderRightWidth: 0.5, borderRightColor: PDF_COLORS.grid }}>
                    <View style={{ flex: 1, borderRightWidth: 0.5, borderRightColor: PDF_COLORS.grid }} />
                    <View style={{ flex: 1 }} />
                  </View>
                ))}
              </View>
            ))}
          </View>

          {pageIndex === pages.length - 1 ? (
            <Text style={[styles.metaText, { marginTop: 3 }]}>
              Totales por terapia:{" "}
              {therapies
                .map((therapy) => `${therapy.nameEs} ${totals.find((total) => total.therapyId === therapy.id)?.sessions ?? 0}`)
                .join(" · ")}
            </Text>
          ) : null}

          <PdfFooter left={`F24 · ${data.courseLabel} · ${formatDate(data.from)} a ${formatDate(data.to)}`} />
        </Page>
      ))}
    </Document>
  );
}
