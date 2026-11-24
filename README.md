# MoodTune

MoodTune adalah aplikasi web Java dengan Spring Boot, Spring MVC, Thymeleaf, dan JPA.

## Menjalankan aplikasi

Persyaratan: Java 25 (LTS) atau lebih baru dan Maven.

```powershell
$env:MOODTUNE_ADMIN_USERNAME = "admin"
$env:MOODTUNE_ADMIN_PASSWORD = "admin23"
mvn spring-boot:run
```

Buka `http://localhost:8090` dan masuk dengan username `admin` serta password yang diatur pada `MOODTUNE_ADMIN_PASSWORD`. Demi keamanan, password tidak disimpan di source code dan wajib diatur sebelum aplikasi dijalankan. Data disimpan secara lokal di folder `data/` menggunakan H2. Untuk PostgreSQL, atur `DATABASE_URL`, `DATABASE_USERNAME`, dan `DATABASE_PASSWORD`.

Fitur AI memakai Gemini 3.5 Flash-Lite yang dioptimalkan untuk respons cepat dan memerlukan environment variable `GEMINI_API_KEY`. Untuk memilih model lain, atur `GEMINI_MODEL`. Tanpa key, fitur koleksi, playlist, jurnal, dan insights tetap bisa digunakan.

## Fitur

- CRUD koleksi lagu dengan genre, tahun, dan catatan mood.
- Dashboard beranda dengan pintasan berdasarkan suasana hati.
- Login admin dengan password yang di-hash dan sesi aplikasi.
- CRUD playlist, kelola lagu di playlist, serta ubah urutan lagu.
- Jurnal mood dengan energi dan tautan ke lagu.
- Ringkasan statistik koleksi, playlist, artis, genre, dan jurnal.
- Rekomendasi musik beragam dari luar koleksi, rancangan playlist, dan penjelasan tema lagu melalui Gemini.
- Mini-player audio dan YouTube di seluruh halaman; posisi pratinjau audio dipulihkan saat berpindah halaman.
- Pratinjau audio iTunes dan pemutaran video YouTube langsung di halaman.
- Pembuatan soundscape ambient yang diputar melalui Web Audio API.

## Struktur arsitektur

- `model/` berisi model domain tanpa anotasi JPA atau Spring.
- `domain/port/` mendefinisikan port persistence; `usecase/` berisi alur bisnis dan port untuk layanan AI/audio.
- `adapter/persistence/` berisi entity dan repository JPA serta adapter yang menerjemahkan model domain ke penyimpanan.
- `web/` dan `config/` menangani MVC, keamanan, serta wiring bean; adapter transaksi mengisolasi transaksi Spring.

Penyesuaian ini mengikuti pemisahan Clean Architecture pada materi P5 tanpa mengganti teknologi yang sudah dipakai MoodTune. Aplikasi tetap menggunakan Spring MVC, Thymeleaf, Spring Data JPA, dan H2 sebagai default dengan PostgreSQL opsional. Karena itu, proyek ini belum identik dengan stack contoh P5 yang mewajibkan Vaadin dan JDBC/PostgreSQL.

`YOUTUBE_API_KEY` bersifat opsional: jika tersedia, aplikasi menggunakan YouTube Data API; jika tidak, aplikasi mencari video melalui hasil publik YouTube. Jika API gagal, aplikasi tetap mencoba pencarian publik dan menyediakan tautan pencarian. Kegagalan pratinjau iTunes tidak menghalangi pencarian atau pemutaran YouTube. Versi Spring MVC ini dirancang untuk penggunaan lokal satu pengguna. Database lama berbasis PostgreSQL/Firebase tidak dimigrasikan otomatis; atur koneksi database baru dan migrasikan datanya secara terpisah bila diperlukan.

Source React/TypeScript versi sebelumnya masih disimpan sebagai referensi dan tidak dijalankan oleh Maven. Kontrol antrean player lama belum dipindahkan ke versi Java.
