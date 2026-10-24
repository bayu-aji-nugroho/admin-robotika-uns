# Brand Guideline & Design System
## Robotika Universitas Sebelas Maret (UKM Robotika UNS)

> **Dokumen Panduan Resmi Desain & Identitas Digital**  
> Versi: 1.0.0  
> Terakhir Diperbarui: Oktober 2026  
> Basis Teknologi: Next.js (App Router), Tailwind CSS v4, Framer Motion, Lucide Icons  



### 1.3 Karakter & Nada Suara (Voice & Tone)
| Karakteristik | Penjelasan | Contoh Aplikasi di Website |
| :--- | :--- | :--- |
| **Presisi & Terstruktur** | Bersih, rapi, berbasis data, tanpa hiperbola kosong. | Angka statistik konkret (`30+ Anggota Aktif`, `12+ Robot`). |
| **Inspiratif & Kompetitif** | Menumbuhkan rasa bangga dan dorongan berkontribusi. | *"Ketika ide dan inovasi bertemu."* |
| **Akademik & Modern** | Formal namun mudah diakses mahasiswa muda tech-savvy. | Menggunakan istilah teknologi standar (`Computer Vision`, `Firmware`). |
| **Kolaboratif** | Terbuka untuk seluruh disiplin ilmu (teknik, MIPA, sosial). | *"Mewadahi potensi mahasiswa lintas disiplin untuk berkolaborasi."* |

---

## 2. Logo & Brandmark System

### 2.1 Komposisi Identitas Header
Di navbar dan header resmi, identitas brand menggabungkan dua elemen:
1. **Wordmark Robotika UNS**:
   - Teks Utama: `ROBOTIKA` (Font: *Plus Jakarta Sans*, All Caps, ExtraBold, Tracking Wide, Color `#18181b`).
   - Teks Pendukung: `Universitas Sebelas Maret` (Font: *Inter*, Semibold, 9px, Color `#71717a`).
2. **Divider Vertikal**: Garis tipis 1px (`#e4e4e7`, tinggi 28px).
3. **Lambang Resmi UNS**: Logo Universitas Sebelas Maret berwarna penuh (tinggi 36px, aspect ratio terkunci).

### 2.2 Aturan Ruang Aman & Penggunaan
- **Clearance**: Berikan ruang kosong minimal 16px di sekeliling logo.
- **Background**: Hanya diletakkan di atas background putih (`#FFFFFF`) atau kontras tinggi (`#F9F9F8`).
- **Larangan**:
  - ❌ Mengubah proporsi atau merentangkan logo UNS.
  - ❌ Memberi bayangan (*drop shadow*) tebal warna-warni pada wordmark.
  - ❌ Menempatkan logo di atas background berpola ramai tanpa latar belakang kontras.

---

## 3. Color Palette & Design Tokens

Sistem warna memadukan warna merah khas almamater UNS dengan palet netral zinc yang bersih, serta aksen bernuansa teknikal.

### 3.1 Primary & Accent Colors
| Nama Token | HEX Code | CSS Variable | Peran & Penggunaan |
| :--- | :--- | :--- | :--- |
| **UNS Crimson Red** | `#B22234` | `--color-primary` | Warna utama identitas, CTA button primer, badge aktif, heading accent. |
| **Deep Maroon** | `#8B0000` | `--color-primary-dark` | Hover state CTA primer, border fokus interaktif, teks penekanan khusus. |
| **Soft Red Wash** | `#FCF2F3` | `--color-primary-subtle`| Background badge aktif, background icon container tim/divisi. |
| **Subtle Red Border** | `#F8D7DA` | `--color-border-red` | Garis tepi badge merah dan kartu sorotan (*highlight card*). |
| **Sienna Accent** | `#A0522D` | `--color-accent` | Aksen sekunder hangat untuk elemen badge info / pattern halus. |

### 3.2 Neutral & Surface Colors
| Nama Token | HEX Code | Tailwind Class | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Dark Neutral (Heading)** | `#18181b` | `text-zinc-900` | Judul utama, heading h1-h4, angka stat utama. |
| **Navy Neutral** | `#102e4a` | `text-[#102e4a]` | Warna teks alternatif untuk body sub-halaman. |
| **Text Muted Dark** | `#52525b` | `text-zinc-600` | Paragraf sekunder, lead text, subketerangan kartu. |
| **Text Muted Light** | `#71717a` | `text-zinc-500` | Label metadata, tanggal, nomor seri `01`/`02`, breadcrumbs. |
| **Light Canvas Border** | `#E4E4E7` | `border-zinc-200` | Garis pembatas kartu, separator section, batas form. |
| **Pure White Surface** | `#FFFFFF` | `bg-white` | Kartu informasi, navbar fixed, modal, popover. |
| **Canvas Background** | `#F9F9F8` | `bg-[#F9F9F8]` | Background section bergantian (menghindari kebosanan visual). |
| **Page Base Light** | `#F7FAFD` | `bg-[#f7fafd]` | Latar belakang dasar halaman detail divisi. |

### 3.3 Standar Aksesibilitas Kontras (WCAG AA)
- Teks `#18181b` di atas `#FFFFFF`: Rasio kontras **16.1:1** (Lolos AAA).
- Teks `#B22234` di atas `#FFFFFF`: Rasio kontras **5.5:1** (Lolos AA untuk teks reguler & bold).
- Teks putih `#FFFFFF` di atas `#B22234`: Rasio kontras **5.5:1** (Lolos AA).
- Teks `#71717a` di atas `#FFFFFF`: Rasio kontras **4.6:1** (Lolos AA).

---

## 4. Typography System

Tipografi seluruh website kini menggunakan font tunggal teroptimasi **League Spartan** via `next/font/google`:

```
1. League Spartan -> Bold, Modern, Geometric, Display, Heading & Body
2. JetBrains/Mono -> Technical Metadata, Counters, Badges
```

### 4.1 Skala Tipografi (Type Scale)

| Tingkatan | Font Family | Desktop Size / Leading | Mobile Size / Leading | Weight | Penggunaan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | League Spartan | `60px` / `1.15` | `32px` / `1.2` | Extrabold (800) | Judul besar Hero Section |
| **Section Title (H2)** | League Spartan | `36px - 40px` / `1.25` | `24px - 28px` / `1.3` | Extrabold (800) | Judul Section ("Tentang Kami", "Ekosistem") |
| **Sub-heading (H3)** | League Spartan | `20px - 24px` / `1.3` | `18px` / `1.35` | Bold (700) | Header kategori ("Tim Robotika", "Teknis") |
| **Card Title (H4)** | League Spartan | `16px - 18px` / `1.4` | `15px - 16px` / `1.4` | Bold (700) | Judul nama tim/divisi di dalam kartu |
| **Lead Paragraph** | League Spartan | `16px - 18px` / `1.6` | `14px - 15px` / `1.6` | Medium / Semibold | Kalimat pembuka section / tagline divisi |
| **Body Text** | League Spartan | `14px` / `1.65` | `13px` / `1.6` | Regular (400) | Deskripsi umum, penjelasan peran divisi |
| **Caption / Tiny** | League Spartan | `12px` / `1.5` | `11px` / `1.5` | Medium (500) | Catatan kaki, copyright, link eksternal |
| **Tech Metadata** | Monospace | `11px - 12px` / `1` | `10px - 11px` / `1` | Bold (700) / Mono | Nomor indeks `01`, badge `OPREC`, slug path |

---

## 5. Iconography & Visual Assets

### 5.1 Icon Library
- **Library**: `lucide-react`
- **Gaya Stroke**: Konsisten garis luar (*line icons*) dengan ketebalan 1.5px hingga 2.0px.
- **Ukuran Baku**:
  - `14px - 16px`: Ikon dalam button, badge, dan list peran.
  - `20px - 24px`: Ikon kartu divisi/tim di dalam container persegi.
- **Palet Warna Ikon**:
  - Netral: `#71717a` (default)
  - Interaktif: Berubah menjadi `#B22234` saat hover.



### 5.3 Aturan Fotografi & Aset Visual
- **Subjek**: Foto aktivitas nyata bengkel robotika, robot tanding, proses perakitan, dan kompetisi KRI resmi.
- **Grading & Tone**: Natural, tajam, pencahayaan cukup, tidak menggunakan filter warna berlebihan.
- **Rasio Aspek**: `4:3` untuk kartu & banner detail, `16:9` untuk showcase responsif.
- **Border Radius**: Sudut melengkung `rounded-lg` (8px) hingga `rounded-2xl` (16px) dengan border halus `1px solid #e4e4e7`.

---

## 6. UI Components & Atomic Design System

### 6.1 Buttons
| Varian | Style Utama | Hover State | Fungsi |
| :--- | :--- | :--- | :--- |
| **Primary** | `bg-[#B22234] text-white rounded-sm sm:rounded-md px-5 py-2.5 text-xs font-semibold shadow-xs` | `hover:bg-[#8B0000]` | "Daftar Sekarang", "Tertarik Bergabung", aksi utama. |
| **Secondary / Outline** | `bg-white text-[#18181b] border border-[#e4e4e7] rounded-sm sm:rounded-md px-5 py-2.5 text-xs font-semibold` | `hover:bg-[#f4f4f5]` | "Masuk", "Kembali", aksi sekunder. |
| **Pill Link** | `text-[#B22234] hover:text-[#8B0000] font-semibold text-xs inline-flex items-center gap-1` | `translate-x-0.5` | Link eksplorasi kartu ("Buka profil tim ->"). |

### 6.2 Badges & Chips
- **Status / OPREC**: Background putih, border `#e4e4e7`, label tag merah solid `#B22234` teks putih monospace.
- **Section Indicator**: Tag nomor merah bold (`01`, `02`) bersanding dengan teks uppercase tracker (`TENTANG KAMI`, `DIVISI DAN TIM`).
- **Tech Skill Chip**: Background `#FCF2F3`, border `#F8D7DA`, teks `#B22234`, sudut `rounded-lg` (8px).

### 6.3 Cards & Containers
- **Card Default**: Background `#FFFFFF`, border halus `1px solid #E4E4E7`, sudut `rounded-xl` (12px).
- **Interactive Card Hover**:
  - Border bertransisi menjadi `#B22234`.
  - Icon background berubah menjadi `#B22234` dan ikon menjadi putih.
  - Arrow icon bergeser ke kanan `2px` (`group-hover:translate-x-0.5`).
- **Focus Rings**: `focus-visible:ring-2 focus-visible:ring-[#B22234] focus-visible:outline-hidden` (wajib untuk aksesibilitas navigasi keyboard).

---

## 7. Layout, Spacing & Responsive Grid

### 7.1 Container & Grid
- **Max Container**: `max-w-7xl` (`1280px`), dipusatkan dengan `mx-auto`.
- **Horizontal Padding**:
  - Ponsel (`<640px`): `px-4` (16px)
  - Tablet (`640px - 1024px`): `px-6` (24px)
  - Desktop (`>1024px`): `px-8` (32px)
- **12-Column Layout System**:
  - Hero Section: `col-span-6` (Teks) + `col-span-6` (Visual Media).
  - About Section: `col-span-6` (Headline) + `col-span-6` (Deskripsi narasi).
  - Division Detail Page: `col-span-8` (Konten teknis) + `col-span-4` (Sidebar metadata & CTA).

### 7.2 Vertical Spacing (Rhythm)
- **Section Padding**:
  - Ponsel: `py-12` (48px)
  - Tablet: `py-16` (64px)
  - Desktop: `py-20` (80px)
- **Stack Spacing Antar Komponen**: `space-y-4` (16px), `space-y-6` (24px), `space-y-10` (40px).

---

## 8. Copywriting & Content Guidelines

### 8.1 Format Penamaan Resmi
| Penggunaan Benar | Penggunaan Salah (Hindari) |
| :--- | :--- |
| **Robotika Universitas Sebelas Maret** | Robotika UNS Solo |
| **UKM Robotika UNS** | Klub Robotik UNS |
| **Tim Werkudara** | Werkudara Team / Tim Robocon |
| **Kontes Robot ABU Indonesia (KRAI)** | Lomba ABU robot |
| **Divisi Mekanika / Elektronika / Pemrograman** | Sie Mekanik / Sie Elektro |

### 8.2 Struktur Pesan (Message Hierarchy)
1. **Headline**: Dimulai dengan kata kerja atau penegasan visi yang jelas (Maks. 8-10 kata).
2. **Subheadline**: Menyertakan konteks universitas dan target kompetitif tingkat nasional/global.
3. **Action Point**: Tombol aksi yang jelas maksudnya (*"Daftar Sekarang"*, *"Pelajari Lebih Lanjut"*, *"Hubungi Kami"*).

---

## 9. Checklist Kualitas Desain (Do's & Don'ts)

### ✅ Do's (Lakukan)
1. Gunakan palet merah `#B22234` sebagai aksen aksi terarah, bukan memblok seluruh layar dengan warna merah menyala.
2. Pertahankan whitespace bersih agar konten berbobot teknik tetap mudah dicerna pembaca.
3. Pastikan setiap kartu tautan memiliki status *focus-visible* yang jelas untuk pengguna keyboard.
4. Tampilkan angka-angka metrik yang akurat dan dapat dipertanggungjawabkan.

### ❌ Don'ts (Hindari)
1. Jangan mencampur lebih dari 3 jenis font pada satu layar.
2. Jangan menggunakan bayangan (*box-shadow*) hitam pekat atau berwarna pelangi yang mengalihkan perhatian dari informasi.
3. Jangan menumpuk teks panjang tanpa jeda visual atau pemecahan ke dalam poin-poin terstruktur.
4. Jangan menambahkan animasi bergerak terus-menerus yang mengganggu kenyamanan membaca pengguna (*motion sickness*).
