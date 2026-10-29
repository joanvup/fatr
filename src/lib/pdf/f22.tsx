import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatDate } from "@/lib/dates";
import { OBSERVATION_STATUS_LABELS } from "@/lib/constants";
import { PdfFooter, PdfHeader } from "@/lib/pdf/header";
import { styles } from "@/lib/pdf/theme";
import { chunk, clip, yesNo } from "@/lib/pdf/text";
import type { PdfHeaderInfo } from "@/lib/pdf/types";

export type F22Row = {
  studentName: string;
  documentId: string;
  observationDate: string | null;
  parentMeetingDate: string | null;
  parentAttended: boolean | null;
  studentMeetingDate: string | null;
  diagnosisNote: string | null;
  nextFollowUpDate: string | null;
  scores: { domainId: string; level: number | null; note: string | null }[];
};

export type F22DocumentData = {
  header: PdfHeaderInfo;
  cycle: {
    label: string;
    year: number;
    period: number;
    dateFrom: string;
    dateTo: string;
    status: string;
    courseName: string;
  };
  domains: { id: string; nameEs: string; nameEn: string }[];
  rows: F22Row[];
  rowsPerPage: number;
};

const COL = {
  student: 104,
  domain: 70,
  date: 56,
  attended: 38,
  diagnosis: 92,
  follow: 54,
};
const ROW_HEIGHT = 20.6;

function Cell({
  width,
  children,
  center = false,
  height = ROW_HEIGHT,
}: {
  width: number;
  children: React.ReactNode;
  center?: boolean;
  height?: number;
}) {
  return (
    <View style={[styles.td, { width, height, alignItems: center ? "center" : "stretch" }]}>
      {typeof children === "string" ? (
        <Text style={[styles.tdText, center ? styles.center : {}]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export function F22Document({ data }: { data: F22DocumentData }) {
  const { header, cycle, domains, rows, rowsPerPage } = data;
  const pages = chunk(rows, rowsPerPage);
  const footerLeft = `F22 · ${cycle.courseName} · ${cycle.label} · ${cycle.year}`;

  return (
    <Document
      title={`${header.code} · Observaciones ${cycle.courseName}`}
      author={header.institution}
      subject="Formative assessment and observation record"
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
            titleEs="Formative Assessment and observation tool / Herramienta de observación y evaluación formativa"
            titleEn="Observaciones por curso · Classroom observations"
          />

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              Date from/Día de inicio: <Text style={styles.metaStrong}>{formatDate(cycle.dateFrom)}</Text> to/hasta:{" "}
              <Text style={styles.metaStrong}>{formatDate(cycle.dateTo)}</Text>
            </Text>
            <Text style={styles.metaText}>
              Class/Curso: <Text style={styles.metaStrong}>{cycle.courseName}</Text> · {cycle.label} · {cycle.year} ·{" "}
              {OBSERVATION_STATUS_LABELS[cycle.status] ?? cycle.status}
            </Text>
          </View>

          <View style={styles.table}>
            <View style={[styles.headRow, { height: 48 }]}>
              <View style={[styles.th, { width: COL.student }]}>
                <Text style={styles.thText}>ESTUDIANTE{"\n"}Student</Text>
              </View>
              {domains.map((domain) => (
                <View key={domain.id} style={[styles.th, { width: COL.domain }]}>
                  <Text style={[styles.thText, { fontSize: 5.1, lineHeight: 1.2 }]}>{domain.nameEs}</Text>
                  <Text style={{ fontSize: 4, lineHeight: 1.2, color: "#55606d", textAlign: "center", marginTop: 1 }}>{domain.nameEn}</Text>
                </View>
              ))}
              <View style={[styles.th, { width: COL.date }]}>
                <Text style={styles.thText}>FECHA DE{"\n"}OBSERVACIÓN</Text>
              </View>
              <View style={[styles.th, { width: COL.date }]}>
                <Text style={styles.thText}>CITAS CON PADRES{"\n"}DE FAMILIA (FECHA)</Text>
              </View>
              <View style={[styles.th, { width: COL.attended }]}>
                <Text style={styles.thText}>ASISTIERON</Text>
              </View>
              <View style={[styles.th, { width: COL.date }]}>
                <Text style={styles.thText}>CITA CON{"\n"}ESTUDIANTES</Text>
              </View>
              <View style={[styles.th, { width: COL.diagnosis }]}>
                <Text style={styles.thText}>DIAGNÓSTICO</Text>
              </View>
              <View style={[styles.th, { width: COL.follow, borderRightWidth: 0 }]}>
                <Text style={styles.thText}>SEGUIMIENTO{"\n"}(FECHA PROYECTADA)</Text>
              </View>
            </View>

            {pageRows.map((row) => {
              const scoreByDomain = new Map(row.scores.map((score) => [score.domainId, score]));
              return (
                <View key={`${row.documentId}-${row.studentName}`} style={styles.row} wrap={false}>
                  <Cell width={COL.student}>
                    <Text style={{ fontSize: 6.4, fontWeight: "bold" }}>
                      {row.studentName}
                    </Text>
                    <Text style={styles.tdSmall}>CC {row.documentId}</Text>
                  </Cell>
                  {domains.map((domain) => {
                    const score = scoreByDomain.get(domain.id);
                    return (
                      <View
                        key={domain.id}
                        style={[styles.td, { width: COL.domain, height: ROW_HEIGHT, flexDirection: "row", alignItems: "center" }]}
                      >
                        <Text
                          style={{
                            width: 10,
                            fontSize: 9,
                            fontWeight: "bold",
                            textAlign: "center",
                            color: score?.level ? "#173a5e" : "#9ca3af",
                          }}
                        >
                          {score?.level ?? "—"}
                        </Text>
                        <Text style={{ flex: 1, fontSize: 5, lineHeight: 1.15, color: "#374151" }}>
                          {clip(score?.note, 46)}
                        </Text>
                      </View>
                    );
                  })}
                  <Cell width={COL.date} center>{formatDate(row.observationDate)}</Cell>
                  <Cell width={COL.date} center>{formatDate(row.parentMeetingDate)}</Cell>
                  <Cell width={COL.attended} center>{yesNo(row.parentAttended)}</Cell>
                  <Cell width={COL.date} center>{formatDate(row.studentMeetingDate)}</Cell>
                  <Cell width={COL.diagnosis}>
                    <Text style={{ fontSize: 5.2, lineHeight: 1.15 }}>{clip(row.diagnosisNote, 68)}</Text>
                  </Cell>
                  <Cell width={COL.follow} center>{formatDate(row.nextFollowUpDate)}</Cell>
                </View>
              );
            })}

            {Array.from({ length: Math.max(0, rowsPerPage - pageRows.length) }).map((_, index) => (
              <View key={`blank-${index}`} style={styles.row}>
                <Cell width={COL.student}>&nbsp;</Cell>
                {domains.map((domain) => (
                  <Cell key={domain.id} width={COL.domain}>&nbsp;</Cell>
                ))}
                <Cell width={COL.date}>&nbsp;</Cell>
                <Cell width={COL.date}>&nbsp;</Cell>
                <Cell width={COL.attended}>&nbsp;</Cell>
                <Cell width={COL.date}>&nbsp;</Cell>
                <Cell width={COL.diagnosis}>&nbsp;</Cell>
                <Cell width={COL.follow}>&nbsp;</Cell>
              </View>
            ))}
          </View>

          <PdfFooter left={footerLeft} />
        </Page>
      ))}
    </Document>
  );
}
