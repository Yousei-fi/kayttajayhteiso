import "server-only";
import QRCode from "qrcode";

/** Renders a QR code as an inline SVG string — generated server-side so no
 * client JS or third-party image service is involved. */
export async function qrCodeSvg(data: string): Promise<string> {
  return QRCode.toString(data, {
    type: "svg",
    margin: 1,
    color: { dark: "#1e1b29", light: "#0000" },
  });
}
