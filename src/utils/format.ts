import * as XLSX from 'xlsx';

export function formatRupiah(value: number | null | undefined): string {
  const num = Number(value || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dt);
}

export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return '-';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(dt);
}

export function exportToExcel(sheetName: string, rows: Record<string, unknown>[], filename: string): void {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportWorkbookSheets(
  sheets: Array<{ name: string; rows: Record<string, unknown>[] }>,
  filename: string
): void {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length > 0 ? s.rows : [{ Keterangan: 'Belum ada data' }]);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export const ORDER_STATUS_LABEL: Record<string, { label: string; colorClass: string }> = {
  MENUNGGU_PEMBAYARAN: { label: 'Menunggu Pembayaran', colorClass: 'text-amber-700' },
  MENUNGGU_KONFIRMASI: { label: 'Menunggu Konfirmasi', colorClass: 'text-orange-700' },
  DIPROSES: { label: 'Diproses', colorClass: 'text-sky-700' },
  SIAP_DIAMBIL: { label: 'Siap Diambil', colorClass: 'text-emerald-700' },
  SELESAI: { label: 'Selesai', colorClass: 'text-emerald-800' },
  DIBATALKAN: { label: 'Dibatalkan', colorClass: 'text-rose-700' },
};

export const LOAN_STATUS_LABEL: Record<string, { label: string; colorClass: string }> = {
  MENUNGGU_PERSETUJUAN: { label: 'Menunggu Persetujuan', colorClass: 'text-amber-700' },
  DISETUJUI: { label: 'Disetujui', colorClass: 'text-sky-700' },
  AKTIF: { label: 'Aktif Berjalan', colorClass: 'text-emerald-700' },
  LUNAS: { label: 'Lunas', colorClass: 'text-slate-700' },
  DITOLAK: { label: 'Ditolak', colorClass: 'text-rose-700' },
};
