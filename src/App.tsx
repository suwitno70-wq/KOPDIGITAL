import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CreditCard,
  FileSpreadsheet,
  Home,
  Landmark,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type {
  AdminStatsResponse,
  AnggotaRecord,
  AngsuranRecord,
  FinancialReportSummary,
  KasRecord,
  KategoriRecord,
  LogAktivitasRecord,
  PengaturanKoperasi,
  PengumumanRecord,
  PesananRecord,
  PinjamanRecord,
  ProdukRecord,
  SimpananRecord,
  SupplierRecord,
  UserRecord,
} from './types/koperasi';
import { apiFetch, getStoredToken, setStoredToken } from './utils/api';
import { formatRupiah } from './utils/format';
import { OfflineIndicator, PWAInstallButton, ReceiptModal } from './components/common/PWAWidgets';
import { LoginModal } from './components/auth/LoginModal';
import { MarketplaceHome } from './components/marketplace/MarketplaceHome';
import { CartDrawer, type CartItem } from './components/marketplace/CartDrawer';
import { OrdersView } from './components/marketplace/OrdersView';
import { CashierPosView } from './components/pos/CashierPosView';
import { SimpananView } from './components/finance/SimpananView';
import { PinjamanView } from './components/finance/PinjamanView';
import { AccountingReportsView } from './components/finance/AccountingReportsView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import {
  AuditBackupView,
  MembersUsersManagerView,
  ProductsManagerView,
  SettingsAnnouncementsView,
  SupplierManagerView,
} from './components/admin/ManagementViews';

const DEFAULT_PENGATURAN: PengaturanKoperasi = {
  nama_koperasi: 'KOPERASI DIGITAL PRO',
  tagline: 'Marketplace & Sistem Keuangan Koperasi Modern',
  branding: 'KREATIF BY WITNO',
  alamat: 'Jl. Jenderal Sudirman No. 88, Bandung',
  telepon: '(022) 8880-2026',
  email: 'halo@koperasidigitalpro.id',
  npwp_badan_hukum: 'AHU-0028194.AH.01.29.TAHUN 2025',
  bunga_pinjaman_persen_per_bulan: 1.5,
  simpanan_pokok_wajib: 500000,
  simpanan_wajib_bulanan: 150000,
  izinkan_bayar_saldo_koperasi: true,
  bank_nama: 'Bank BCA',
  bank_rekening: '7750-8891-2026',
  bank_atas_nama: 'KOPERASI DIGITAL PRO',
  qris_merchant_id: 'ID10202600088192',
  qris_merchant_nama: 'KOPERASI DIGITAL PRO',
  shu_jasa_modal_persen: 25,
  shu_jasa_anggota_persen: 30,
  shu_cadangan_persen: 25,
  shu_pengurus_persen: 10,
  shu_sosial_persen: 10,
  logo_url: '/icon.svg',
  katalog_hero_judul: 'Belanja kebutuhan harian lebih hemat dengan harga khusus anggota koperasi.',
  katalog_hero_subjudul:
    'Setiap transaksi otomatis tercatat dalam perhitungan Sisa Hasil Usaha (SHU) tahunan Anda dan mendukung produk UMKM anggota.',
  katalog_hero_foto: '/src/assets/images/hero_koperasi_banner_1794528004578.jpg',
  katalog_urutan_default: 'TERBARU',
  katalog_tampil_badge_diskon: true,
  katalog_kolom_desktop: 4,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('beranda');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [pengaturan, setPengaturan] = useState<PengaturanKoperasi>(DEFAULT_PENGATURAN);
  const [kategori, setKategori] = useState<KategoriRecord[]>([]);
  const [produk, setProduk] = useState<ProdukRecord[]>([]);
  const [pengumuman, setPengumuman] = useState<PengumumanRecord[]>([]);
  const [user, setUser] = useState<UserRecord | null>(null);
  const [anggota, setAnggota] = useState<AnggotaRecord | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [latestReceipt, setLatestReceipt] = useState<PesananRecord | null>(null);
  const [editProductId, setEditProductId] = useState<string | null>(null);

  // Authenticated module datasets
  const [orders, setOrders] = useState<PesananRecord[]>([]);
  const [simpananData, setSimpananData] = useState<{ riwayat: SimpananRecord[]; rekap_anggota: AnggotaRecord[] }>({
    riwayat: [],
    rekap_anggota: [],
  });
  const [pinjamanData, setPinjamanData] = useState<{ pinjaman: PinjamanRecord[]; angsuran: AngsuranRecord[] }>({
    pinjaman: [],
    angsuran: [],
  });
  const [adminStats, setAdminStats] = useState<AdminStatsResponse | null>(null);
  const [financeData, setFinanceData] = useState<{ kas: KasRecord[]; summary: FinancialReportSummary } | null>(null);
  const [masterData, setMasterData] = useState<{
    produk: ProdukRecord[];
    kategori: KategoriRecord[];
    anggota: AnggotaRecord[];
    users: UserRecord[];
    supplier: SupplierRecord[];
    pengumuman: PengumumanRecord[];
    logs: LogAktivitasRecord[];
  } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadBootstrap = useCallback(async () => {
    try {
      const data = await apiFetch<{
        pengaturan: PengaturanKoperasi;
        kategori: KategoriRecord[];
        produk: ProdukRecord[];
        pengumuman: PengumumanRecord[];
        user: UserRecord | null;
        anggota: AnggotaRecord | null;
      }>('/api/bootstrap');
      setPengaturan(data.pengaturan);
      setKategori(data.kategori);
      setProduk(data.produk);
      setPengumuman(data.pengumuman);
      setUser(data.user);
      setAnggota(data.anggota);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAuthenticatedData = useCallback(async (currentUser: UserRecord | null) => {
    if (!currentUser) {
      setOrders([]);
      setSimpananData({ riwayat: [], rekap_anggota: [] });
      setPinjamanData({ pinjaman: [], angsuran: [] });
      setAdminStats(null);
      setFinanceData(null);
      setMasterData(null);
      return;
    }

    const promises: Promise<void>[] = [
      apiFetch<PesananRecord[]>('/api/orders').then(setOrders),
      apiFetch<{ riwayat: SimpananRecord[]; rekap_anggota: AnggotaRecord[] }>('/api/simpanan').then(setSimpananData),
      apiFetch<{ pinjaman: PinjamanRecord[]; angsuran: AngsuranRecord[] }>('/api/pinjaman').then(setPinjamanData),
    ];

    if (currentUser.role === 'ADMIN' || currentUser.role === 'KASIR') {
      promises.push(apiFetch<AdminStatsResponse>('/api/admin/stats').then(setAdminStats));
      promises.push(apiFetch<typeof masterData>('/api/admin/master').then(setMasterData));
    }
    if (currentUser.role === 'ADMIN') {
      promises.push(apiFetch<{ kas: KasRecord[]; summary: FinancialReportSummary }>('/api/finance/summary').then(setFinanceData));
    }

    await Promise.allSettled(promises);
  }, []);

  const refreshAll = useCallback(async () => {
    const u = await loadBootstrap();
    await loadAuthenticatedData(u);
  }, [loadBootstrap, loadAuthenticatedData]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Sync cart to server if logged in
  const syncCartToServer = async (nextCart: CartItem[]) => {
    if (!getStoredToken()) return;
    try {
      await apiFetch('/api/cart', {
        method: 'PUT',
        body: JSON.stringify({
          items: nextCart.map((c) => ({ id_produk: c.produk.id_produk, qty: c.qty })),
        }),
      });
    } catch {
      // ignore offline cart sync error
    }
  };

  const handleAddToCart = (prod: ProdukRecord, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.produk.id_produk === prod.id_produk);
      const next = existing
        ? prev.map((i) =>
            i.produk.id_produk === prod.id_produk
              ? { ...i, qty: Math.min(prod.stok, i.qty + qty) }
              : i
          )
        : [...prev, { produk: prod, qty: Math.min(prod.stok, qty) }];
      syncCartToServer(next);
      return next;
    });
    showToast(`${prod.nama_produk} ditambahkan ke keranjang`);
  };

  const handleUpdateCartQty = (idProduk: string, qty: number) => {
    setCart((prev) => {
      const next =
        qty <= 0
          ? prev.filter((i) => i.produk.id_produk !== idProduk)
          : prev.map((i) => (i.produk.id_produk === idProduk ? { ...i, qty } : i));
      syncCartToServer(next);
      return next;
    });
  };

  const handleRemoveCartItem = (idProduk: string) => {
    setCart((prev) => {
      const next = prev.filter((i) => i.produk.id_produk !== idProduk);
      syncCartToServer(next);
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setStoredToken(null);
    setUser(null);
    setAnggota(null);
    setActiveTab('beranda');
    await loadAuthenticatedData(null);
    showToast('Anda telah keluar dari sesi.');
  };

  const navItems = useMemo(() => {
    const items = [
      { id: 'beranda', label: 'Beranda & Katalog', icon: Home, show: true },
      { id: 'orders', label: user?.role === 'ANGGOTA' ? 'Pesanan Saya' : 'Kelola Pesanan', icon: ShoppingBag, show: !!user },
      { id: 'simpanan', label: 'Simpanan Anggota', icon: Wallet, show: !!user },
      { id: 'pinjaman', label: 'Pinjaman & Angsuran', icon: Landmark, show: !!user },
      { id: 'kasir', label: 'Kasir POS', icon: Store, show: user?.role === 'ADMIN' || user?.role === 'KASIR' },
      { id: 'admin-dashboard', label: 'Dashboard Admin', icon: LayoutDashboard, show: user?.role === 'ADMIN' },
      { id: 'admin-produk', label: 'Produk & Barcode', icon: Package, show: user?.role === 'ADMIN' },
      { id: 'admin-anggota', label: 'Anggota & Users', icon: Users, show: user?.role === 'ADMIN' },
      { id: 'admin-supplier', label: 'Mitra Supplier', icon: Truck, show: user?.role === 'ADMIN' },
      { id: 'keuangan', label: 'Keuangan & SHU', icon: FileSpreadsheet, show: user?.role === 'ADMIN' },
      { id: 'admin-pengaturan', label: 'Pengaturan & Info', icon: Settings, show: user?.role === 'ADMIN' },
      { id: 'admin-logs', label: 'Audit & Backup', icon: Shield, show: user?.role === 'ADMIN' },
    ];
    return items.filter((i) => i.show);
  }, [user]);

  const notifications = useMemo(() => {
    const list: Array<{ title: string; subtitle: string; tab: string }> = [];
    if (user && (user.role === 'ADMIN' || user.role === 'KASIR') && adminStats) {
      if (adminStats.pesananMenungguVerifikasi > 0) {
        list.push({
          title: `${adminStats.pesananMenungguVerifikasi} Pesanan Menunggu Verifikasi`,
          subtitle: 'Segera cek bukti transfer dan proses pesanan.',
          tab: 'orders',
        });
      }
      if (adminStats.pinjamanMenungguPersetujuan > 0) {
        list.push({
          title: `${adminStats.pinjamanMenungguPersetujuan} Pengajuan Pinjaman Baru`,
          subtitle: 'Menunggu persetujuan pengurus koperasi.',
          tab: 'pinjaman',
        });
      }
    }
    const readyOrders = orders.filter((o) => o.status_pesanan === 'SIAP_DIAMBIL');
    readyOrders.forEach((o) => {
      list.push({
        title: `Pesanan ${o.nomor_pesanan} Siap Diambil`,
        subtitle: `Total ${formatRupiah(o.total_bayar)} di gerai koperasi.`,
        tab: 'orders',
      });
    });
    return list;
  }, [user, adminStats, orders]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const navigateProtected = (tab: string) => {
    if (!user && tab !== 'beranda') {
      setLoginOpen(true);
      return;
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
          <div className="border-b border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={() => setActiveTab('beranda')}
              className="flex items-center gap-2.5 text-left"
            >
              <img src="/icon.svg" alt={pengaturan.nama_koperasi} className="h-9 w-9 rounded-lg" />
              <div className="min-w-0">
                <p className="font-display text-sm font-extrabold tracking-tight text-emerald-900 truncate">
                  {pengaturan.nama_koperasi}
                </p>
                <p className="text-[10px] font-bold tracking-wider text-amber-600">
                  {pengaturan.branding}
                </p>
              </div>
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateProtected(item.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4 text-xs">
            {user ? (
              <div className="space-y-2">
                <div>
                  <p className="font-semibold text-slate-900 truncate">{user.nama_lengkap}</p>
                  <p className="text-[11px] font-medium text-emerald-700">{user.role}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Keluar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-700 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                <LogIn className="h-4 w-4" />
                Masuk / Daftar Anggota
              </button>
            )}
          </div>
        </aside>

        {/* Main Viewport */}
        <div className="flex flex-1 flex-col min-w-0 pb-20 md:pb-8">
          {/* Top Bar */}
          <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
              <div className="flex items-center gap-3 md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Buka menu navigasi"
                  className="rounded-lg border border-slate-200 p-2 text-slate-700"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <span className="font-display text-sm font-extrabold text-emerald-900 truncate">
                  {pengaturan.nama_koperasi}
                </span>
              </div>

              <div className="relative hidden flex-1 max-w-lg sm:block">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (activeTab !== 'beranda') setActiveTab('beranda');
                  }}
                  placeholder="Cari produk, kategori, SKU, atau barcode..."
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-emerald-700 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <PWAInstallButton />

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotifOpen((v) => !v)}
                    aria-label="Notifikasi koperasi"
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    <Bell className="h-4 w-4" />
                    {notifications.length > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 font-mono-num text-[10px] font-bold text-white">
                        {notifications.length}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-40">
                      <p className="border-b border-slate-100 pb-2 text-xs font-bold text-slate-900">
                        Notifikasi ({notifications.length})
                      </p>
                      <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="py-4 text-center text-xs text-slate-400">Tidak ada notifikasi baru.</p>
                        ) : (
                          notifications.map((n, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setNotifOpen(false);
                                navigateProtected(n.tab);
                              }}
                              className="w-full rounded-lg bg-slate-50 p-2.5 text-left hover:bg-emerald-50"
                            >
                              <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                              <p className="mt-0.5 text-[11px] text-slate-600">{n.subtitle}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  <ShoppingCart className="h-4 w-4 text-emerald-700" />
                  <span className="hidden sm:inline">Keranjang</span>
                  <span className="font-mono-num rounded bg-emerald-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {cartCount}
                  </span>
                </button>

                {!user && (
                  <button
                    type="button"
                    onClick={() => setLoginOpen(true)}
                    className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
                  >
                    Masuk
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Main Content Container */}
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">
            {activeTab === 'beranda' && (
              <MarketplaceHome
                loading={loading}
                produk={produk}
                kategori={kategori}
                pengumuman={pengumuman}
                pengaturan={pengaturan}
                user={user}
                anggota={anggota}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onAddToCart={handleAddToCart}
                onNavigate={navigateProtected}
                onOpenLogin={() => setLoginOpen(true)}
                onEditProduct={(id) => {
                  setEditProductId(id);
                  navigateProtected('admin-produk');
                }}
              />
            )}

            {activeTab === 'orders' && user && (
              <OrdersView
                orders={orders}
                user={user}
                pengaturan={pengaturan}
                onRefresh={refreshAll}
              />
            )}

            {activeTab === 'simpanan' && user && (
              <SimpananView
                user={user}
                anggotaSaya={anggota}
                riwayat={simpananData.riwayat}
                rekapAnggota={simpananData.rekap_anggota}
                onRefresh={refreshAll}
              />
            )}

            {activeTab === 'pinjaman' && user && (
              <PinjamanView
                user={user}
                anggotaSaya={anggota}
                anggotaList={masterData?.anggota || simpananData.rekap_anggota}
                pinjaman={pinjamanData.pinjaman}
                angsuran={pinjamanData.angsuran}
                pengaturan={pengaturan}
                onRefresh={refreshAll}
              />
            )}

            {activeTab === 'kasir' && user && (user.role === 'ADMIN' || user.role === 'KASIR') && (
              <CashierPosView
                produk={produk}
                anggotaList={masterData?.anggota || []}
                todayOrders={orders}
                pengaturan={pengaturan}
                onOrderCompleted={() => {
                  refreshAll();
                  showToast('Transaksi Kasir POS berhasil disimpan!');
                }}
              />
            )}

            {activeTab === 'admin-dashboard' && user?.role === 'ADMIN' && adminStats && (
              <AdminDashboard stats={adminStats} onNavigate={navigateProtected} />
            )}

            {activeTab === 'admin-produk' && user?.role === 'ADMIN' && masterData && (
              <ProductsManagerView
                produk={masterData.produk}
                kategori={masterData.kategori}
                supplier={masterData.supplier}
                pengaturan={pengaturan}
                onRefresh={refreshAll}
                initialEditProductId={editProductId}
                onClearInitialEdit={() => setEditProductId(null)}
                onNavigate={navigateProtected}
              />
            )}

            {activeTab === 'admin-anggota' && user?.role === 'ADMIN' && masterData && (
              <MembersUsersManagerView
                anggota={masterData.anggota}
                users={masterData.users}
                onRefresh={refreshAll}
              />
            )}

            {activeTab === 'admin-supplier' && user?.role === 'ADMIN' && masterData && (
              <SupplierManagerView supplier={masterData.supplier} onRefresh={refreshAll} />
            )}

            {activeTab === 'keuangan' && user?.role === 'ADMIN' && financeData && (
              <AccountingReportsView
                kas={financeData.kas}
                summary={financeData.summary}
                pengaturan={pengaturan}
                onRefresh={refreshAll}
              />
            )}

            {activeTab === 'admin-pengaturan' && user?.role === 'ADMIN' && masterData && (
              <SettingsAnnouncementsView
                pengaturan={pengaturan}
                pengumuman={masterData.pengumuman}
                onRefresh={refreshAll}
              />
            )}

            {activeTab === 'admin-logs' && user?.role === 'ADMIN' && masterData && (
              <AuditBackupView logs={masterData.logs} />
            )}
          </main>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-900/50">
          <div className="flex h-full w-72 flex-col bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="font-display text-sm font-extrabold text-emerald-900">{pengaturan.nama_koperasi}</p>
                <p className="text-[10px] font-bold text-amber-600">{pengaturan.branding}</p>
              </div>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateProtected(item.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-semibold ${
                      activeTab === item.id ? 'bg-emerald-700 text-white' : 'text-slate-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 rounded-lg border border-slate-300 py-2 text-xs font-semibold text-slate-700"
              >
                Keluar ({user.username})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLoginOpen(true);
                }}
                className="mt-3 rounded-lg bg-emerald-700 py-2.5 text-xs font-semibold text-white"
              >
                Masuk Akun
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation (Compact <15% viewport height) */}
      <nav className="no-print fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white py-1.5 md:hidden">
        <button
          type="button"
          onClick={() => navigateProtected('beranda')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-semibold ${
            activeTab === 'beranda' ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <Home className="h-4 w-4" />
          Beranda
        </button>
        <button
          type="button"
          onClick={() => navigateProtected('orders')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-semibold ${
            activeTab === 'orders' ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          Pesanan
        </button>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-semibold text-slate-500"
        >
          <ShoppingCart className="h-4 w-4" />
          Keranjang ({cartCount})
        </button>
        <button
          type="button"
          onClick={() => navigateProtected('simpanan')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-semibold ${
            activeTab === 'simpanan' ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Simpanan
        </button>
        <button
          type="button"
          onClick={() => navigateProtected(user?.role === 'ADMIN' ? 'admin-dashboard' : 'pinjaman')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-semibold ${
            activeTab === 'pinjaman' || activeTab === 'admin-dashboard' ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <Landmark className="h-4 w-4" />
          {user?.role === 'ADMIN' ? 'Admin' : 'Pinjaman'}
        </button>
      </nav>

      {/* Modals & Drawers */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        user={user}
        anggota={anggota}
        pengaturan={pengaturan}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onRequireLogin={() => {
          setCartOpen(false);
          setLoginOpen(true);
        }}
        onOrderCreated={(order, updatedAnggota) => {
          setCart([]);
          setCartOpen(false);
          if (updatedAnggota) setAnggota(updatedAnggota);
          setLatestReceipt(order);
          refreshAll();
          showToast(`Pesanan ${order.nomor_pesanan} berhasil dibuat!`);
        }}
      />

      {loginOpen && (
        <LoginModal
          onClose={() => setLoginOpen(false)}
          onSuccess={async (payload) => {
            setUser(payload.user);
            setAnggota(payload.anggota);
            setLoginOpen(false);
            await refreshAll();
            if (payload.user.role === 'ADMIN') setActiveTab('admin-dashboard');
            else if (payload.user.role === 'KASIR') setActiveTab('kasir');
            showToast(`Selamat datang, ${payload.user.nama_lengkap}`);
          }}
        />
      )}

      {latestReceipt && (
        <ReceiptModal
          order={latestReceipt}
          pengaturan={pengaturan}
          onClose={() => setLatestReceipt(null)}
        />
      )}

      {toast && (
        <div className="no-print fixed right-4 top-16 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}
