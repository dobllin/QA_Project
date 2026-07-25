// ============================================================
// FILE: app/institusi/[id]/laporan/page.tsx
// ============================================================

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LaporanClient from "./laporan-client";
import LaporanMingguanClient from "./laporan-mingguan-client";

type CustomField = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
};

type ProgresRow = {
  id: string;
  tanggal: string;
  kategori_id: number;
  jenis_setoran: string | null;
  lancar: boolean | null;
  surah_mulai: string | null;
  ayat_mulai: number | null;
  surah_selesai: string | null;
  ayat_selesai: number | null;
  kitab_nama: string | null;
  bab: string | null;
  halaman_mulai: number | null;
  halaman_selesai: number | null;
  absen: boolean | null;
  kendala: string | null;
  iqro_jilid: number | null;
  iqro_halaman: number | null;
  kualitas: string | null;
  catatan: string | null;
  custom_values: Record<string, string | number | null> | null;
};

type KehadiranRow = {
  id: string;
  tanggal: string;
  status: string;
  keterangan: string | null;
};

// ============================================================
// Kategori yang masuk laporan mingguan. Dicocokkan dari NAMA kategori,
// bukan hardcode dua nama, supaya "Murojaah", "Tahfidz", dan
// "Hafalan Surah Pendek" ikut kebaca juga.
// ============================================================
const KEYWORD_MINGGUAN = [
  "tahsin",
  "tahfiz",
  "tahfidz",
  "hafalan",
  "murojaah",
  "muroja",
  "quran",
  "qur'an",
];

function isKategoriMingguan(nama: string) {
  const l = nama.toLowerCase();
  return KEYWORD_MINGGUAN.some((k) => l.includes(k));
}

// Minggu ISO 8601: Senin s/d Minggu. Format dari <input type="week">: "2026-W30".
function isoWeekToRange(weekStr: string): { start: string; end: string } {
  const m = weekStr.match(/^(\d{4})-W(\d{1,2})$/);
  if (!m) return isoWeekToRange(getCurrentWeekStr());

  const year = parseInt(m[1]);
  const week = parseInt(m[2]);

  // 4 Januari selalu jatuh di minggu ke-1 menurut ISO 8601.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Dow = jan4.getUTCDay() || 7; // Minggu dihitung 7
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Dow - 1));

  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

function getCurrentWeekStr(): string {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow); // geser ke Kamis minggu ini
  const year = d.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

const jenisSetoranLabelSrv: Record<string, string> = {
  hafalan_baru: "Hafalan baru",
  setoran: "Setoran",
  murojaah: "Murojaah",
};

// Materi dirangkum di server biar komponen client tetap ringan.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ringkasMateri(p: any): string {
  const parts: string[] = [];
  if (p.jenis_setoran) {
    parts.push(jenisSetoranLabelSrv[p.jenis_setoran] ?? p.jenis_setoran);
  }
  if (p.surah_mulai || p.surah_selesai) {
    const mulai = [p.surah_mulai, p.ayat_mulai].filter(Boolean).join(":");
    const selesai = [p.surah_selesai, p.ayat_selesai].filter(Boolean).join(":");
    parts.push(`${mulai || "?"} -> ${selesai || "?"}`);
  }
  if (p.iqro_jilid) parts.push(`Jilid ${p.iqro_jilid}`);
  if (p.iqro_halaman) parts.push(`Hal ${p.iqro_halaman}`);
  return parts.join(" \u00b7 ");
}

function monthToDateRange(monthStr: string): { start: string; end: string } {
  const match = monthStr.match(/^(\d{4})-(\d{1,2})$/);
  if (!match) {
    const now = new Date();
    return currentMonthRange(now);
  }
  const year = parseInt(match[1]);
  const month = parseInt(match[2]);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function currentMonthRange(d: Date): { start: string; end: string } {
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function getCurrentMonthStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default async function LaporanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    santri?: string;
    bulan?: string;
    mode?: string;
    minggu?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const santriId = sp.santri;
  const mode: "bulanan" | "mingguan" =
    sp.mode === "mingguan" ? "mingguan" : "bulanan";
  const currentBulan = sp.bulan ?? getCurrentMonthStr();
  const currentMinggu = sp.minggu ?? getCurrentWeekStr();
  const institusiId = Number(id);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  let isAdmin = profile?.is_super_admin ?? false;
  if (!isAdmin) {
    const { data: adminCheck } = await supabase
      .from("user_institusi")
      .select("peran")
      .eq("user_id", user.id)
      .eq("institusi_id", institusiId)
      .eq("peran", "admin");
    isAdmin = (adminCheck?.length ?? 0) > 0;
  }

  let ustadzAssignments: { santri_id: string; kategori_id: number }[] = [];
  if (!isAdmin) {
    const { data: userInst } = await supabase
      .from("user_institusi")
      .select("peran")
      .eq("user_id", user.id)
      .eq("institusi_id", institusiId)
      .in("peran", ["ustadz", "ustadzah"]);

    if (!userInst || userInst.length === 0) {
      redirect(`/institusi/${institusiId}`);
    }

    const { data: myAssignments } = await supabase
      .from("ustadz_santri")
      .select("santri_id, kategori_id")
      .eq("ustadz_id", user.id);

    ustadzAssignments = myAssignments ?? [];
  }

  const { data: institusi } = await supabase
    .from("institusi")
    .select("id, nama, jenis")
    .eq("id", institusiId)
    .single();

  const institusiSafe = institusi ?? { id: institusiId, nama: "", jenis: "" };

  // ============================================================
  // MODE MINGGUAN — cuma kategori tahsin/tahfiz, dikelompokkan per
  // ustadz pengampu supaya tiap ustadz punya blok + TTD sendiri.
  // ============================================================
  if (mode === "mingguan") {
    const { start: mStart, end: mEnd } = isoWeekToRange(currentMinggu);
    const NO_UUID = "00000000-0000-0000-0000-000000000000";

    const { data: semuaKategori } = await supabase
      .from("kategori")
      .select("id, nama")
      .eq("institusi_id", institusiId)
      .order("nama");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const katMingguan = ((semuaKategori ?? []) as any[]).filter((k) =>
      isKategoriMingguan(String(k.nama ?? "")),
    );
    const kategoriIds = katMingguan.map((k) => Number(k.id));

    let assignQuery = supabase
      .from("ustadz_santri")
      .select("id, ustadz_id, santri_id, kategori_id")
      .in("kategori_id", kategoriIds.length > 0 ? kategoriIds : [-1]);

    // Ustadz cuma lihat santri ampuannya sendiri. Admin lihat semua.
    if (!isAdmin) {
      assignQuery = assignQuery.eq("ustadz_id", user.id);
    }

    const { data: assignsRaw } = await assignQuery;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assigns = (assignsRaw ?? []) as any[];

    const santriIds = Array.from(
      new Set(assigns.map((a) => String(a.santri_id))),
    );
    const ustadzIds = Array.from(
      new Set(assigns.map((a) => String(a.ustadz_id))),
    );

    const [{ data: santriRows }, { data: ustadzRows }, { data: progresRows }] =
      await Promise.all([
        supabase
          .from("santri")
          .select("id, nama, kelas, halaqoh")
          .in("id", santriIds.length > 0 ? santriIds : [NO_UUID]),
        supabase
          .from("profiles")
          .select("id, nama, ttd_url")
          .in("id", ustadzIds.length > 0 ? ustadzIds : [NO_UUID]),
        supabase
          .from("progress")
          .select(
            "id, tanggal, santri_id, kategori_id, jenis_setoran, lancar, absen, surah_mulai, ayat_mulai, surah_selesai, ayat_selesai, iqro_jilid, iqro_halaman, kualitas, catatan",
          )
          .in("santri_id", santriIds.length > 0 ? santriIds : [NO_UUID])
          .in("kategori_id", kategoriIds.length > 0 ? kategoriIds : [-1])
          .gte("tanggal", mStart)
          .lte("tanggal", mEnd)
          .order("tanggal", { ascending: true }),
      ]);

    const santriMap = new Map<
      string,
      { nama: string; kelas: string | null; halaqoh: string | null }
    >();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of (santriRows ?? []) as any[]) {
      santriMap.set(String(s.id), {
        nama: s.nama,
        kelas: s.kelas ?? null,
        halaqoh: s.halaqoh ?? null,
      });
    }

    const ustadzMap = new Map<
      string,
      { nama: string; ttdUrl: string | null }
    >();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const u of (ustadzRows ?? []) as any[]) {
      ustadzMap.set(String(u.id), {
        nama: u.nama,
        ttdUrl: u.ttd_url ?? null,
      });
    }

    const kategoriNamaMap = new Map<number, string>();
    for (const k of katMingguan) {
      kategoriNamaMap.set(Number(k.id), String(k.nama));
    }

    type ProgresMingguan = {
      id: string;
      tanggal: string;
      materi: string;
      kualitas: string | null;
      lancar: boolean | null;
      hadir: boolean | null;
      catatan: string | null;
    };

    const progresPerSantriKategori = new Map<string, ProgresMingguan[]>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const pr of (progresRows ?? []) as any[]) {
      const kunci = `${pr.santri_id}::${pr.kategori_id}`;
      const list = progresPerSantriKategori.get(kunci) ?? [];
      list.push({
        id: String(pr.id),
        tanggal: String(pr.tanggal).slice(0, 10),
        materi: ringkasMateri(pr),
        kualitas: pr.kualitas ?? null,
        lancar: pr.lancar ?? null,
        hadir:
          pr.absen === null || pr.absen === undefined
            ? null
            : pr.absen === false,
        catatan: pr.catatan ?? null,
      });
      progresPerSantriKategori.set(kunci, list);
    }

    type SantriBlok = {
      santriId: string;
      santriNama: string;
      kelas: string | null;
      halaqoh: string | null;
      progres: ProgresMingguan[];
    };

    const grupMap = new Map<
      string,
      {
        ustadzId: string;
        ustadzNama: string;
        ttdUrl: string | null;
        kategori: Map<
          number,
          { kategoriId: number; kategoriNama: string; santri: SantriBlok[] }
        >;
      }
    >();

    for (const a of assigns) {
      const uid = String(a.ustadz_id);
      const sid = String(a.santri_id);
      const kid = Number(a.kategori_id);

      const u = ustadzMap.get(uid);
      const st = santriMap.get(sid);
      const kNama = kategoriNamaMap.get(kid);
      if (!u || !st || !kNama) continue;

      if (!grupMap.has(uid)) {
        grupMap.set(uid, {
          ustadzId: uid,
          ustadzNama: u.nama,
          ttdUrl: u.ttdUrl,
          kategori: new Map(),
        });
      }
      const grup = grupMap.get(uid)!;

      if (!grup.kategori.has(kid)) {
        grup.kategori.set(kid, {
          kategoriId: kid,
          kategoriNama: kNama,
          santri: [],
        });
      }
      const kGrup = grup.kategori.get(kid)!;
      if (kGrup.santri.some((x) => x.santriId === sid)) continue;

      kGrup.santri.push({
        santriId: sid,
        santriNama: st.nama,
        kelas: st.kelas,
        halaqoh: st.halaqoh,
        progres: progresPerSantriKategori.get(`${sid}::${kid}`) ?? [],
      });
    }

    const ustadzGroups = Array.from(grupMap.values())
      .map((g) => ({
        ustadzId: g.ustadzId,
        ustadzNama: g.ustadzNama,
        ttdUrl: g.ttdUrl,
        kategoriGroups: Array.from(g.kategori.values())
          .map((k) => ({
            kategoriId: k.kategoriId,
            kategoriNama: k.kategoriNama,
            santri: k.santri.sort((x, y) =>
              x.santriNama.localeCompare(y.santriNama),
            ),
          }))
          .sort((x, y) => x.kategoriNama.localeCompare(y.kategoriNama)),
      }))
      .sort((x, y) => x.ustadzNama.localeCompare(y.ustadzNama));

    let totalBaris = 0;
    let totalBelumDiisi = 0;
    for (const g of ustadzGroups) {
      for (const k of g.kategoriGroups) {
        for (const st of k.santri) {
          totalBaris += 1;
          if (st.progres.length === 0) totalBelumDiisi += 1;
        }
      }
    }

    return (
      <div>
        <LaporanTabs institusiId={institusiId} mode={mode} />
        <LaporanMingguanClient
          institusi={institusiSafe}
          institusiId={institusiId}
          currentMinggu={currentMinggu}
          periodeStart={mStart}
          periodeEnd={mEnd}
          ustadzGroups={ustadzGroups}
          totalBaris={totalBaris}
          totalBelumDiisi={totalBelumDiisi}
          adaKategoriMingguan={kategoriIds.length > 0}
        />
      </div>
    );
  }

  let santriListQuery = supabase
    .from("santri")
    .select("id, nama, kelas, halaqoh, tahun_masuk, poin")
    .eq("institusi_id", institusiId)
    .order("nama");

  if (!isAdmin) {
    const mySantriIds = Array.from(
      new Set(ustadzAssignments.map((a) => a.santri_id)),
    );
    if (mySantriIds.length === 0) {
      santriListQuery = santriListQuery.eq(
        "id",
        "00000000-0000-0000-0000-000000000000",
      );
    } else {
      santriListQuery = santriListQuery.in("id", mySantriIds);
    }
  }

  const { data: santriList } = await santriListQuery;

  const { start: startDate, end: endDate } = monthToDateRange(currentBulan);

  let santriData = null;
  if (santriId) {
    const canAccess =
      isAdmin || ustadzAssignments.some((a) => a.santri_id === santriId);

    if (canAccess) {
      const { data: santri } = await supabase
        .from("santri")
        .select("id, nama, kelas, halaqoh, tahun_masuk, poin, wali_kelas_id")
        .eq("id", santriId)
        .eq("institusi_id", institusiId)
        .single();

      if (santri) {
        const allowedKategoriIds = isAdmin
          ? null
          : new Set(
              ustadzAssignments
                .filter((a) => a.santri_id === santriId)
                .map((a) => a.kategori_id),
            );

        let kategoriQuery = supabase
          .from("kategori")
          .select("id, nama, custom_fields")
          .eq("institusi_id", institusiId)
          .order("nama");

        if (allowedKategoriIds) {
          const ids = Array.from(allowedKategoriIds);
          if (ids.length === 0) {
            kategoriQuery = kategoriQuery.eq("id", -1);
          } else {
            kategoriQuery = kategoriQuery.in("id", ids);
          }
        }

        let progressQuery = supabase
          .from("progress")
          .select(
            "id, tanggal, kategori_id, jenis_setoran, lancar, surah_mulai, ayat_mulai, surah_selesai, ayat_selesai, kitab_nama, bab, halaman_mulai, halaman_selesai, absen, kendala, iqro_jilid, iqro_halaman, kualitas, catatan, custom_values",
          )
          .eq("santri_id", santriId)
          .gte("tanggal", startDate)
          .lte("tanggal", endDate)
          .order("tanggal", { ascending: true });

        if (allowedKategoriIds) {
          const ids = Array.from(allowedKategoriIds);
          if (ids.length === 0) {
            progressQuery = progressQuery.eq("kategori_id", -1);
          } else {
            progressQuery = progressQuery.in("kategori_id", ids);
          }
        }

        const [
          { data: kategoriList },
          { data: progressList },
          { data: poinList },
          { data: kehadiranList },
        ] = await Promise.all([
          kategoriQuery,
          progressQuery,
          supabase
            .from("poin_log")
            .select("id, jenis, nilai_perubahan, keterangan, tanggal")
            .eq("santri_id", santriId)
            .gte("tanggal", startDate)
            .lte("tanggal", endDate)
            .order("tanggal", { ascending: true }),
          supabase
            .from("kehadiran")
            .select("id, tanggal, status, keterangan")
            .eq("santri_id", santriId)
            .gte("tanggal", startDate)
            .lte("tanggal", endDate)
            .order("tanggal", { ascending: true }),
        ]);

        const kategoriMap = new Map<
          number,
          {
            id: number;
            nama: string;
            customFields: CustomField[];
            progres: ProgresRow[];
          }
        >();
        for (const k of kategoriList ?? []) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const kAny = k as any;
          kategoriMap.set(kAny.id, {
            id: kAny.id,
            nama: kAny.nama,
            customFields: Array.isArray(kAny.custom_fields)
              ? kAny.custom_fields
              : [],
            progres: [],
          });
        }
        for (const p of (progressList ?? []) as ProgresRow[]) {
          const entry = kategoriMap.get(p.kategori_id);
          if (entry) entry.progres.push(p);
        }

        const kategoriWithProgres = Array.from(kategoriMap.values()).filter(
          (k) => k.progres.length > 0,
        );

        // ============================================================
        // KEHADIRAN — dihitung PER SESI, bukan per hari.
        //
        // Kolom progress.absen dicatat per kategori, jadi satu hari bisa
        // punya beberapa catatan: santri hadir di Bahasa tapi tidak hadir
        // di Kitab. Kalau digabung per hari, satu "hadir" akan menelan
        // semua "tidak hadir" di hari yang sama dan angkanya jadi 100%
        // padahal ustadz mencatat ketidakhadiran.
        //
        // Ingat semantik kolom lama: absen === false berarti HADIR.
        // Nama kategori ditaruh di keterangan biar jelas ini sesi apa.
        //
        // Tabel `kehadiran` (diisi admin) bersifat harian dan lebih
        // otoritatif: kalau admin sudah mencatat di suatu tanggal, seluruh
        // baris sesi di tanggal itu diganti oleh catatan admin.
        // ============================================================
        const kehadiranFromProgress: KehadiranRow[] = [];
        for (const p of (progressList ?? []) as ProgresRow[]) {
          if (p.absen === null || p.absen === undefined) continue;
          kehadiranFromProgress.push({
            id: `progress-${p.id}`,
            tanggal: String(p.tanggal).slice(0, 10),
            status: p.absen === false ? "hadir" : "alpha",
            keterangan: kategoriMap.get(p.kategori_id)?.nama ?? null,
          });
        }

        const kehadiranFromTabel: KehadiranRow[] = (kehadiranList ?? []).map(
          (k) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const kAny = k as any;
            return {
              id: String(kAny.id),
              tanggal: String(kAny.tanggal).slice(0, 10),
              status: String(kAny.status),
              keterangan: kAny.keterangan ?? null,
            };
          },
        );

        const tanggalDicatatAdmin = new Set(
          kehadiranFromTabel.map((k) => k.tanggal),
        );

        const kehadiranRows: KehadiranRow[] = [
          ...kehadiranFromProgress.filter(
            (k) => !tanggalDicatatAdmin.has(k.tanggal),
          ),
          ...kehadiranFromTabel,
        ].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

        const kehadiranCount = {
          hadir: kehadiranRows.filter((k) => k.status === "hadir").length,
          izin: kehadiranRows.filter((k) => k.status === "izin").length,
          sakit: kehadiranRows.filter((k) => k.status === "sakit").length,
          alpha: kehadiranRows.filter((k) => k.status === "alpha").length,
        };
        const totalTercatat =
          kehadiranCount.hadir +
          kehadiranCount.izin +
          kehadiranCount.sakit +
          kehadiranCount.alpha;

        // Fetch wali kelas info (nama + ttd_url) kalo santri punya wali_kelas_id
        let waliKelas: {
          id: string;
          nama: string;
          ttd_url: string | null;
        } | null = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const walikelasId = (santri as any).wali_kelas_id;
        if (walikelasId) {
          const { data: wk } = await supabase
            .from("profiles")
            .select("id, nama, ttd_url")
            .eq("id", walikelasId)
            .single();
          if (wk) {
            waliKelas = {
              id: wk.id,
              nama: wk.nama,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ttd_url: (wk as any).ttd_url ?? null,
            };
          }
        }

        santriData = {
          santri,
          waliKelas,
          kategoriList: kategoriWithProgres,
          totalSetoran: (progressList ?? []).length,
          kehadiranList: kehadiranRows,
          kehadiranCount,
          totalKehadiranTercatat: totalTercatat,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          poinLog: (poinList ?? []) as any[],
          poinAwal:
            (santri.poin ?? 100) -
            (poinList ?? []).reduce((sum, l) => sum + l.nilai_perubahan, 0),
          poinAkhir: santri.poin ?? 100,
        };
      }
    }
  }

  return (
    <div>
      <LaporanTabs institusiId={institusiId} mode={mode} />
      <LaporanClient
        institusi={institusiSafe}
        institusiId={institusiId}
        santriList={santriList ?? []}
        currentSantriId={santriId ?? null}
        currentBulan={currentBulan}
        periodStart={startDate}
        periodEnd={endDate}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        santriData={santriData as any}
      />
    </div>
  );
}

// ============================================================
// Tab Bulanan / Mingguan
// ============================================================
function LaporanTabs({
  institusiId,
  mode,
}: {
  institusiId: number;
  mode: "bulanan" | "mingguan";
}) {
  const base = `/institusi/${institusiId}/laporan`;
  const kelas = (aktif: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
      aktif
        ? "border-forest-700 text-forest-800"
        : "border-transparent text-ink-500 hover:text-ink-900"
    }`;

  return (
    <div className="flex flex-wrap gap-2 mb-8 border-b border-line">
      <Link href={base} className={kelas(mode === "bulanan")}>
        Laporan bulanan
      </Link>
      <Link
        href={`${base}?mode=mingguan`}
        className={kelas(mode === "mingguan")}
      >
        Laporan mingguan
      </Link>
    </div>
  );
}