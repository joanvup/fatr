import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { formatDate, formatDuration } from "@/lib/dates";
import { PdfFooter, PdfHeader } from "@/lib/pdf/header";
import { PDF_COLORS, styles } from "@/lib/pdf/theme";
import { chunk, clip } from "@/lib/pdf/text";
import type { PdfHeaderInfo } from "@/lib/pdf/types";

export type F25Signature = {
  dataUri: string | null;
  signerName: string | null;
};

export type F25Row = {
  studentName: string;
  documentId: string;
  therapyName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number | null;
  professionalName: string;
  notes: string | null;
  professionalSignature: F25Signature;
  guardianSignature: F25Signature;
};

export type F25DocumentData = {
  header: PdfHeaderInfo;
  date: string;
  courseLabel: string;
  rows: F25Row[];
  rowsPerPage: number;
};

const COL = {
  index: 18,
  date: 44,
  student: 122,
  therapy: 84,
  time: 62,
  duration: 38,
  professional: 88,
  proSignature: 86,
  guardianSignature: 96,
  notes: 168,
};
const ROW_HEIGHT = 37;

function SignatureCell({ signature }: { signature: F25Signature }) {
  if (!signature.dataUri) {
    return <Text style={[styles.tdSmall, styles.center]}>Sin firma</Text>;
  }
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {/* react-pdf no admite texto alternativo en sus imágenes */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={signature.dataUri} style={{ width: 78, height: 20, objectFit: "contain" }} />
      <Text style={{ fontSize: 4.1, color: PDF_COLORS.muted }}>
        {signature.signerName ?? ""}
      </Text>
    </View>
  );
}

export function F25Document({ data }: { data: F25DocumentData }) {
  const { header, rows, rowsPerPage } = data;
  const pages = chunk(rows, rowsPerPage);

  return (
    <Document
      title={`${header.code} · Asistencia ${formatDate(data.date)}`}
      author={header.institution}
      subject="Attendance record"
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
            titleEs="Registro de asistencia"
            titleEn="Attendance record"
          />

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              FECHA: <Text style={styles.metaStrong}>{formatDate(data.date)}</Text>
            </Text>
            <Text style={styles.metaText}>
              CURSO: <Text style={styles.metaStrong}>{data.courseLabel}</Text> · Sesiones:{" "}
              <Text style={styles.metaStrong}>{rows.length}</Text>
            </Text>
          </View>

          <View style={styles.table}>
            <View style={[styles.headRow, { height: 30 }]}>
              <View style={[styles.th, { width: COL.index }]}>
                <Text style={styles.thText}>#</Text>
              </View>
              <View style={[styles.th, { width: COL.date }]}>
                <Text style={styles.thText}>FECHA</Text>
              </View>
              <View style={[styles.th, { width: COL.student }]}>
                <Text style={styles.thText}>ESTUDIANTE</Text>
              </View>
              <View style={[styles.th, { width: COL.therapy }]}>
                <Text style={styles.thText}>TERAPIA O ÁREA DE REFUERZO{"\n"}ASIGNADO</Text>
              </View>
              <View style={[styles.th, { width: COL.time }]}>
                <Text style={styles.thText}>HORA DE INICIO /{"\n"}FINALIZACIÓN</Text>
              </View>
              <View style={[styles.th, { width: COL.duration }]}>
                <Text style={styles.thText}>TIEMPO DE{"\n"}TERAPIA</Text>
              </View>
              <View style={[styles.th, { width: COL.professional }]}>
                <Text style={styles.thText}>PROFESIONAL</Text>
              </View>
              <View style={[styles.th, { width: COL.proSignature }]}>
                <Text style={styles.thText}>FIRMA PROFESIONAL</Text>
              </View>
              <View style={[styles.th, { width: COL.guardianSignature }]}>
                <Text style={styles.thText}>FIRMA ESTUDIANTE{"\n"}O ACUDIENTE</Text>
              </View>
              <View style={[styles.th, { width: COL.notes, borderRightWidth: 0 }]}>
                <Text style={styles.thText}>OBSERVACIONES</Text>
              </View>
            </View>

            {pageRows.map((row, rowIndex) => (
              <View key={`${row.documentId}-${row.startTime}-${rowIndex}`} style={styles.row} wrap={false}>
                <View style={[styles.td, { width: COL.index, height: ROW_HEIGHT, alignItems: "center" }]}>
                  <Text style={styles.tdSmall}>{pageIndex * rowsPerPage + rowIndex + 1}</Text>
                </View>
                <View style={[styles.td, { width: COL.date, height: ROW_HEIGHT }]}>
                  <Text style={[styles.tdText, styles.center]}>{formatDate(data.date)}</Text>
                </View>
                <View style={[styles.td, { width: COL.student, height: ROW_HEIGHT }]}>
                  <Text style={{ fontSize: 6.6, fontWeight: "bold" }}>
                    {row.studentName}
                  </Text>
                  <Text style={styles.tdSmall}>CC {row.documentId}</Text>
                </View>
                <View style={[styles.td, { width: COL.therapy, height: ROW_HEIGHT }]}>
                  <Text style={styles.tdText}>
                    {row.therapyName}
                  </Text>
                </View>
                <View style={[styles.td, { width: COL.time, height: ROW_HEIGHT }]}>
                  <Text style={[styles.tdText, styles.center]}>
                    {row.startTime}
                    {"\n"}
                    {row.endTime}
                  </Text>
                </View>
                <View style={[styles.td, { width: COL.duration, height: ROW_HEIGHT }]}>
                  <Text style={[styles.tdText, styles.center]}>{formatDuration(row.durationMinutes)}</Text>
                </View>
                <View style={[styles.td, { width: COL.professional, height: ROW_HEIGHT }]}>
                  <Text style={styles.tdText}>
                    {row.professionalName}
                  </Text>
                </View>
                <View style={[styles.td, { width: COL.proSignature, height: ROW_HEIGHT, alignItems: "center" }]}>
                  <SignatureCell signature={row.professionalSignature} />
                </View>
                <View style={[styles.td, { width: COL.guardianSignature, height: ROW_HEIGHT, alignItems: "center" }]}>
                  <SignatureCell signature={row.guardianSignature} />
                </View>
                <View style={[styles.td, { width: COL.notes, height: ROW_HEIGHT }]}>
                  <Text style={{ fontSize: 5, lineHeight: 1.2 }}>{clip(row.notes, 120)}</Text>
                </View>
              </View>
            ))}

            {Array.from({ length: Math.max(0, rowsPerPage - pageRows.length) }).map((_, index) => (
              <View key={`blank-${index}`} style={styles.row}>
                <View style={[styles.td, { width: COL.index, height: ROW_HEIGHT, alignItems: "center" }]}>
                  <Text style={styles.tdSmall}>{pageIndex * rowsPerPage + pageRows.length + index + 1}</Text>
                </View>
                <View style={[styles.td, { width: COL.date, height: ROW_HEIGHT }]}>
                  <Text style={[styles.tdText, styles.center]}>{formatDate(data.date)}</Text>
                </View>
                <View style={[styles.td, { width: COL.student, height: ROW_HEIGHT }]} />
                <View style={[styles.td, { width: COL.therapy, height: ROW_HEIGHT }]} />
                <View style={[styles.td, { width: COL.time, height: ROW_HEIGHT }]} />
                <View style={[styles.td, { width: COL.duration, height: ROW_HEIGHT }]} />
                <View style={[styles.td, { width: COL.professional, height: ROW_HEIGHT }]} />
                <View style={[styles.td, { width: COL.proSignature, height: ROW_HEIGHT }]} />
                <View style={[styles.td, { width: COL.guardianSignature, height: ROW_HEIGHT }]} />
                <View style={[styles.td, { width: COL.notes, height: ROW_HEIGHT }]} />
              </View>
            ))}
          </View>

          <PdfFooter left={`F25 · ${formatDate(data.date)} · ${data.courseLabel}`} />
        </Page>
      ))}
    </Document>
  );
}
