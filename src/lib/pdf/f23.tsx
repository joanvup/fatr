import { Document, Page, Text, View } from "@react-pdf/renderer";
import { FOLLOW_UP_STATUS_LABELS, SEX_OPTIONS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { PdfFooter, PdfHeader } from "@/lib/pdf/header";
import { PDF_COLORS, styles } from "@/lib/pdf/theme";
import type { PdfHeaderInfo } from "@/lib/pdf/types";

export type F23DocumentData = {
  header: PdfHeaderInfo;
  followUp: {
    cycleLabel: string | null;
    startDate: string;
    followUpDate: string;
    realizationDate: string;
    diagnosisSnapshot: string | null;
    descriptionInitial: string | null;
    strategies: string | null;
    achievements: string | null;
    followUpNotes: string | null;
    responsibleName: string;
    workArea: string | null;
    counselorName: string | null;
    status: string;
    student: {
      fullName: string;
      documentId: string;
      age: number | null;
      sex: string;
      grade: string;
      courseName: string;
    };
  };
};

const BLOCKS: { key: "descriptionInitial" | "strategies" | "achievements" | "followUpNotes"; title: string }[] = [
  { key: "descriptionInitial", title: "DESCRIPCIÓN ESTADO INICIAL" },
  { key: "strategies", title: "TÉCNICAS, ESTRATEGIAS UTILIZADAS" },
  { key: "achievements", title: "ALCANCES" },
  { key: "followUpNotes", title: "SEGUIMIENTO" },
];

function DataCell({ label, value, width }: { label: string; value: string; width: number | string }) {
  return (
    <View style={{ width: width as number, borderRightWidth: 0.6, borderColor: PDF_COLORS.border, padding: 4 }}>
      <Text style={{ fontSize: 5.2, fontWeight: "bold", color: PDF_COLORS.muted, marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 8 }}>{value}</Text>
    </View>
  );
}

export function F23Document({ data }: { data: F23DocumentData }) {
  const { header, followUp: record } = data;
  const student = record.student;
  const sexLabel = SEX_OPTIONS.find((option) => option.value === record.student.sex)?.label ?? record.student.sex;

  return (
    <Document
      title={`${header.code} · Seguimiento ${student.fullName}`}
      author={header.institution}
      subject="Student follow-up record"
      creator="FATR"
    >
      <Page size="A4" orientation="portrait" style={[styles.page, styles.pagePortrait]}>
        <PdfHeader
          logo={header.logo}
          institution={header.institution}
          code={header.code}
          version={header.version}
          validity={header.validity}
          titleEs="Registro de seguimiento por estudiante"
          titleEn="Student follow-up record"
        />

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            Ciclo: <Text style={styles.metaStrong}>{record.cycleLabel ?? "—"}</Text> · Curso:{" "}
            <Text style={styles.metaStrong}>{student.courseName}</Text>
          </Text>
          <Text style={styles.metaText}>
            Estado: <Text style={styles.metaStrong}>{FOLLOW_UP_STATUS_LABELS[record.status] ?? record.status}</Text>
          </Text>
        </View>

        <View style={{ borderWidth: 0.6, borderColor: PDF_COLORS.border }}>
          <View style={{ flexDirection: "row", borderBottomWidth: 0.6, borderColor: PDF_COLORS.border }}>
            <DataCell label="NOMBRE DEL USUARIO" value={student.fullName} width={210} />
            <DataCell label="NO. DE IDENTIFICACIÓN" value={student.documentId} width={110} />
            <DataCell label="EDAD" value={student.age === null ? "—" : `${student.age} años`} width={60} />
            <View style={{ width: 151, padding: 4 }}>
              <Text style={{ fontSize: 5.2, fontWeight: "bold", color: PDF_COLORS.muted, marginBottom: 2 }}>
                GRADO ESCOLAR
              </Text>
              <Text style={{ fontSize: 8 }}>{student.grade}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row" }}>
            <DataCell label="SEXO" value={sexLabel} width={70} />
            <DataCell label="FECHA DE INICIO" value={formatDate(record.startDate)} width={155} />
            <DataCell label="FECHA DE SEGUIMIENTO" value={formatDate(record.followUpDate)} width={155} />
            <View style={{ width: 151, padding: 4 }}>
              <Text style={{ fontSize: 5.2, fontWeight: "bold", color: PDF_COLORS.muted, marginBottom: 2 }}>
                FECHA DE REALIZACIÓN
              </Text>
              <Text style={{ fontSize: 8 }}>{formatDate(record.realizationDate)}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { backgroundColor: "#f3e8c8" }]}>
          DIAGNÓSTICO (Uso exclusivo terapeuta/orientadora escolar)
        </Text>
        <Text style={[styles.textBlock, { minHeight: 26 }]}>{record.diagnosisSnapshot?.trim() || "—"}</Text>

        {BLOCKS.map((block) => (
          <View key={block.key}>
            <Text style={styles.sectionTitle}>{block.title}</Text>
            <Text style={[styles.textBlock, { minHeight: block.key === "descriptionInitial" ? 58 : 46 }]}>
              {record[block.key]?.trim() || "—"}
            </Text>
          </View>
        ))}

        <View wrap={false} style={{ marginTop: 12 }}>
          <Text style={styles.metaText}>
            Responsable: <Text style={styles.metaStrong}>{record.responsibleName}</Text> · Área de trabajo:{" "}
            <Text style={styles.metaStrong}>{record.workArea ?? "—"}</Text>
          </Text>
          <View style={{ flexDirection: "row", gap: 24, marginTop: 26 }}>
            <View style={{ flex: 1 }}>
              <View style={{ borderTopWidth: 0.6, borderColor: PDF_COLORS.border, paddingTop: 3 }}>
                <Text style={{ fontSize: 5.4, color: PDF_COLORS.muted }}>RESPONSABLE (Profesor o terapeuta)</Text>
                <Text style={{ fontSize: 7.4 }}>{record.responsibleName}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ borderTopWidth: 0.6, borderColor: PDF_COLORS.border, paddingTop: 3 }}>
                <Text style={{ fontSize: 5.4, color: PDF_COLORS.muted }}>ÁREA DE TRABAJO</Text>
                <Text style={{ fontSize: 7.4 }}>{record.workArea ?? "—"}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ borderTopWidth: 0.6, borderColor: PDF_COLORS.border, paddingTop: 3 }}>
                <Text style={{ fontSize: 5.4, color: PDF_COLORS.muted }}>ORIENTADORA</Text>
                <Text style={{ fontSize: 7.4 }}>{record.counselorName ?? "—"}</Text>
              </View>
            </View>
          </View>
        </View>

        <PdfFooter left={`F23 · ${student.fullName} · Realizado ${formatDate(record.realizationDate)}`} portrait />
      </Page>
    </Document>
  );
}
