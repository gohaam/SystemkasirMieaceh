import { Transaction, MenuItem, InventoryItem } from '../types';
import { formatDateTime } from '../utils/formatters';

export class ExportService {
  /**
   * Export transactions to CSV using the semicolon delimiter used by Excel locales.
   */
  public static exportTransactionsToCSV(transactions: Transaction[], filename?: string): void {
    const delimiter = ';';
    const headers = [
      'No. Invoice',
      'Tanggal & Waktu',
      'Kasir',
      'Tipe Pesanan',
      'No Meja',
      'Pelanggan',
      'Jumlah Item',
      'Subtotal (Rp)',
      'Diskon (Rp)',
      'PPN (Rp)',
      'Total Akhir (Rp)',
      'Metode Bayar',
      'Jumlah Bayar (Rp)',
      'Kembalian (Rp)',
      'Status',
      'Rincian Menu',
    ];

    const rows = transactions.map((t) => {
      const itemsDetail = t.items
        .map(
          (i) =>
            `${i.name} (${i.quantity}x @${i.price}${i.options?.cookingStyle ? ` - ${i.options.cookingStyle}` : ''}${i.options?.spiceLevel ? ` - ${i.options.spiceLevel}` : ''})`
        )
        .join('; ');

      return [
        t.invoiceNumber,
        formatDateTime(t.createdAt),
        t.cashierName,
        t.orderType === 'dine_in' ? 'Makan di Tempat' : 'Bawa Pulang',
        t.tableNumber || '-',
        t.customerName || '-',
        t.itemCount,
        t.subtotal,
        t.discountAmount,
        t.taxAmount,
        t.total,
        t.paymentMethod === 'cash'
          ? 'Tunai'
          : t.paymentMethod === 'qris'
            ? 'QRIS'
            : t.paymentMethod === 'transfer'
              ? 'Transfer Bank'
              : 'Debit / EDC',
        t.amountPaid,
        t.changeAmount,
        t.status === 'completed' ? 'Selesai' : 'Dibatalkan',
        itemsDetail,
      ].map((value) => this.escapeCsvValue(value)).join(delimiter);
    });

    const csvContent = '\uFEFF' + [headers.map((header) => this.escapeCsvValue(header)).join(delimiter), ...rows].join('\r\n');
    const defaultName = filename || `laporan_transaksi_mie_aceh_${new Date().toISOString().slice(0, 10)}.csv`;
    this.downloadFile(csvContent, defaultName, 'text/csv;charset=utf-8;');
  }

  /**
   * Export inventory raw materials to CSV
   */
  public static exportInventoryToCSV(items: InventoryItem[], filename?: string): void {
    const headers = [
      'ID Bahan',
      'Nama Bahan',
      'Kategori',
      'Stok Saat Ini',
      'Satuan',
      'Batas Minimum',
      'Estimasi Biaya Satuan (Rp)',
      'Total Nilai Stok (Rp)',
      'Status Stok',
      'Supplier / Pemasok',
      'Terakhir Restock',
    ];

    const rows = items.map((i) => {
      const totalValue = i.currentStock * i.costPerUnit;
      return [
        `"${i.id}"`,
        `"${i.name}"`,
        `"${i.category}"`,
        i.currentStock,
        `"${i.unit}"`,
        i.minStock,
        i.costPerUnit,
        totalValue,
        `"${i.status.toUpperCase()}"`,
        `"${i.supplier || '-'}"`,
        `"${formatDateTime(i.lastRestocked)}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const defaultName = filename || `laporan_stok_bahan_${new Date().toISOString().slice(0, 10)}.csv`;
    this.downloadFile(csvContent, defaultName, 'text/csv;charset=utf-8;');
  }

  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private static escapeCsvValue(value: string | number): string {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }
}
