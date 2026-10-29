import { StyleSheet } from "@react-pdf/renderer";

export const PDF_FONT = "Roboto";

export const PDF_COLORS = {
  ink: "#1f2937",
  muted: "#4b5563",
  soft: "#6b7280",
  border: "#8b8b8b",
  grid: "#b7b7b7",
  header: "#d9d9d9",
  headerAlt: "#efefef",
  brand: "#173a5e",
  band: "#f4f6f8",
  white: "#ffffff",
};

const border = { borderColor: PDF_COLORS.border, borderWidth: 0.6 };

export const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT,
    fontSize: 7,
    color: PDF_COLORS.ink,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 26,
  },
  pagePortrait: {
    paddingTop: 26,
    paddingHorizontal: 32,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.2,
    borderBottomColor: PDF_COLORS.brand,
    paddingBottom: 5,
  },
  logoBox: {
    width: 44,
    height: 46,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    ...border,
  },
  logoImage: {
    width: 40,
    height: 42,
    objectFit: "contain",
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 6,
  },
  institution: {
    fontSize: 8.5,
    fontWeight: "bold",
    letterSpacing: 0.4,
    color: PDF_COLORS.brand,
  },
  titleEs: {
    fontSize: 8.5,
    fontWeight: "bold",
    marginTop: 1.5,
  },
  titleEn: {
    fontSize: 6.5,
    color: PDF_COLORS.muted,
    marginTop: 1,
  },
  headerRight: {
    width: 104,
    alignItems: "flex-end",
  },
  headerMeta: {
    fontSize: 5.8,
    color: PDF_COLORS.muted,
    lineHeight: 1.5,
  },
  headerCode: {
    fontSize: 7.4,
    fontWeight: "bold",
    color: PDF_COLORS.brand,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    gap: 8,
  },
  metaText: {
    fontSize: 6.4,
    color: PDF_COLORS.muted,
  },
  metaStrong: {
    fontWeight: "bold",
    color: PDF_COLORS.ink,
  },
  table: {
    ...border,
    borderTopWidth: 0.6,
  },
  headRow: {
    flexDirection: "row",
    backgroundColor: PDF_COLORS.header,
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.grid,
  },
  th: {
    paddingHorizontal: 2.5,
    paddingVertical: 2,
    justifyContent: "center",
    borderRightWidth: 0.5,
    borderRightColor: PDF_COLORS.grid,
    overflow: "hidden",
  },
  td: {
    paddingHorizontal: 2.5,
    paddingVertical: 1.5,
    justifyContent: "center",
    borderRightWidth: 0.5,
    borderRightColor: PDF_COLORS.grid,
    overflow: "hidden",
  },
  thText: {
    fontSize: 5.2,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 1.25,
  },
  tdText: {
    fontSize: 6,
    lineHeight: 1.2,
  },
  tdSmall: {
    fontSize: 5.2,
    lineHeight: 1.2,
    color: PDF_COLORS.muted,
  },
  center: {
    textAlign: "center",
  },
  muted: {
    color: PDF_COLORS.soft,
  },
  footer: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.grid,
    paddingTop: 3,
    fontSize: 5.8,
    color: PDF_COLORS.muted,
  },
  footerPortrait: {
    left: 32,
    right: 32,
  },
  sectionTitle: {
    fontSize: 6.4,
    fontWeight: "bold",
    backgroundColor: PDF_COLORS.header,
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    borderWidth: 0.6,
    borderColor: PDF_COLORS.border,
    marginTop: 7,
  },
  textBlock: {
    borderWidth: 0.6,
    borderTopWidth: 0,
    borderColor: PDF_COLORS.border,
    padding: 4,
    fontSize: 7.4,
    lineHeight: 1.4,
    textAlign: "justify",
  },
});
