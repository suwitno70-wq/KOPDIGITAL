import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { Download, Printer, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import type { PengaturanKoperasi, PesananRecord } from '../../types/koperasi';
import { formatDateTime, formatRupiah } from '../../utils/format';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5" />
        Pasang Aplikasi
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <Smartphone className="h-3.5 w-3.5 text-emerald-700" />
          Pasang di HP
        </button>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Pasang di iPhone / iPad</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li>1. Ketuk tombol <strong>Bagikan (Share)</strong> di toolbar Safari.</li>
                <li>2. Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</li>
                <li>3. Ketuk <strong>Tambah</strong> untuk menjalankan Koperasi Digital Pro seperti aplikasi native.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-emerald-700 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white shadow-lg md:bottom-4">
      <WifiOff className="h-3.5 w-3.5" />
      Mode Offline — Menampilkan data tersimpan
    </div>
  );
};

export const QrCodeCanvas: React.FC<{ value: string; size?: number; className?: string }> = ({
  value,
  size = 140,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    }).catch(() => {});
  }, [value, size]);

  return <canvas ref={canvasRef} className={`rounded-md bg-white ${className}`} />;
};

export const BarcodeSvg: React.FC<{ value: string; height?: number }> = ({ value, height = 42 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        lineColor: '#0F172A',
        width: 1.5,
        height,
        displayValue: true,
        fontSize: 11,
        margin: 4,
      });
    } catch {
      // ignore invalid barcode characters
    }
  }, [value, height]);

  return <svg ref={svgRef} className="max-w-full" />;
};

export const ProductImage: React.FC<{
  src?: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = 'h-full w-full object-cover' }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 p-4 text-center text-slate-500">
        <span className="font-display text-sm font-semibold text-slate-700 line-clamp-2">{alt}</span>
        <span className="mt-1 text-xs text-slate-400">Produk Koperasi</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="aspect-[4/3] animate-pulse bg-slate-200" />
        <div className="space-y-2.5 p-4">
          <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    ))}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
    <h3 className="font-display text-base font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export const ReceiptModal: React.FC<{
  order: PesananRecord;
  pengaturan: PengaturanKoperasi;
  onClose: () => void;
}> = ({ order, pengaturan, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h3 className="font-display text-base font-bold text-slate-900">Struk Transaksi Resmi</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 text-sm text-slate-800">
          <div className="border-b border-dashed border-slate-300 pb-4 text-center">
            <p className="font-display text-base font-bold tracking-tight text-slate-900">
              {pengaturan.nama_koperasi}
            </p>
            <p className="text-xs text-slate-500">{pengaturan.branding}</p>
            <p className="mt-1 text-xs text-slate-500">{pengaturan.alamat}</p>
            <p className="text-xs text-slate-500">{pengaturan.telepon}</p>
          </div>

          <div className="mt-4 space-y-1 border-b border-dashed border-slate-300 pb-4 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">No. Pesanan</span>
              <span className="font-mono-num font-semibold text-slate-900">{order.nomor_pesanan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tanggal</span>
              <span className="font-mono-num">{formatDateTime(order.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pembeli</span>
              <span className="font-medium text-slate-900">{order.nama_pembeli}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Channel / Metode</span>
              <span>
                {order.channel === 'POS_KASIR' ? 'Kasir POS' : 'Marketplace'} · {order.metode_pembayaran.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2 border-b border-dashed border-slate-300 pb-4">
            {(order.items || []).map((item) => (
              <div key={item.id_detail} className="flex items-start justify-between gap-2 text-xs">
                <div>
                  <p className="font-medium text-slate-900">{item.nama_produk}</p>
                  <p className="font-mono-num text-slate-500">
                    {item.qty} x {formatRupiah(item.harga_satuan)}
                  </p>
                </div>
                <span className="font-mono-num font-semibold text-slate-900">
                  {formatRupiah(item.subtotal)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal Harga Normal</span>
              <span className="font-mono-num">{formatRupiah(order.subtotal)}</span>
            </div>
            {order.diskon_anggota > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Hemat Harga Anggota</span>
                <span className="font-mono-num">-{formatRupiah(order.diskon_anggota)}</span>
              </div>
            )}
            {order.diskon_promo > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Diskon Promo</span>
                <span className="font-mono-num">-{formatRupiah(order.diskon_promo)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
              <span>TOTAL BAYAR</span>
              <span className="font-mono-num">{formatRupiah(order.total_bayar)}</span>
            </div>
            {order.uang_diterima > 0 && (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Dibayar</span>
                  <span className="font-mono-num">{formatRupiah(order.uang_diterima)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Kembalian</span>
                  <span className="font-mono-num">{formatRupiah(order.kembalian)}</span>
                </div>
              </>
            )}
          </div>

          <div className="mt-5 flex flex-col items-center border-t border-dashed border-slate-300 pt-4 text-center">
            <QrCodeCanvas value={`KDP-RECEIPT:${order.nomor_pesanan}:${order.total_bayar}`} size={92} />
            <p className="mt-2 text-[11px] text-slate-500">
              Terima kasih telah berbelanja & berkoperasi bersama kami.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
