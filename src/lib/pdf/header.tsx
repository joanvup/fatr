import { Image, Text, View } from "@react-pdf/renderer";
import { styles } from "@/lib/pdf/theme";

export function PdfHeader({
  logo,
  institution,
  code,
  version,
  validity,
  titleEs,
  titleEn,
}: {
  logo: string;
  institution: string;
  code: string;
  version: string;
  validity: string;
  titleEs: string;
  titleEn: string;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.logoBox}>
        {logo ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={logo} style={styles.logoImage} />
        ) : (
          <Text style={{ fontSize: 5, color: "#6b7280" }}>LOGO</Text>
        )}
      </View>
      <View style={styles.headerCenter}>
        <Text style={styles.institution}>{institution}</Text>
        <Text style={styles.titleEs}>{titleEs}</Text>
        <Text style={styles.titleEn}>{titleEn}</Text>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.headerCode}>{code}</Text>
        <Text style={styles.headerMeta}>VERSIÓN: {version}</Text>
        <Text style={styles.headerMeta}>VIGENCIA: {validity}</Text>
      </View>
    </View>
  );
}

export function PdfFooter({ left, portrait = false }: { left: string; portrait?: boolean }) {
  return (
    <View fixed style={portrait ? [styles.footer, styles.footerPortrait] : styles.footer}>
      <Text>{left}</Text>
      <Text render={({ pageNumber, totalPages }) => `PÁGINA ${pageNumber} DE ${totalPages}`} />
    </View>
  );
}
