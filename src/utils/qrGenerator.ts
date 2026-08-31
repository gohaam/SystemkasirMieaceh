import QRCode from 'qrcode';

/**
 * Generate a QR Code Data URL (PNG base64) with high error correction and custom colors.
 */
export const generateQRCodeDataURL = async (
  text: string,
  options?: {
    width?: number;
    margin?: number;
    colorDark?: string;
    colorLight?: string;
  }
): Promise<string> => {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: options?.width || 300,
      margin: options?.margin ?? 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: options?.colorDark || '#166534',
        light: options?.colorLight || '#FFFFFF',
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    // Fallback simple svg placeholder
    return '';
  }
};

/**
 * Build the customer ordering URL for a specific table
 */
export const getTableOrderUrl = (tableNumber: string): string => {
  if (typeof window === 'undefined') return `?table=${encodeURIComponent(tableNumber)}`;
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?table=${encodeURIComponent(tableNumber)}`;
};
