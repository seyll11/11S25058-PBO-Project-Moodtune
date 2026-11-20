# MoodTune

MoodTune adalah aplikasi web Java dengan Spring Boot, Spring MVC, Thymeleaf, dan JPA.

## Menjalankan aplikasi

Persyaratan: Java 25 (LTS) atau lebih baru dan Maven.

```powershell
mvn spring-boot:run
```

Buka `http://localhost:8090`. Data disimpan secara lokal di folder `data/` menggunakan H2. Untuk PostgreSQL, atur `DATABASE_URL`, `DATABASE_USERNAME`, dan `DATABASE_PASSWORD`.

Fitur AI memakai Gemini 3.5 Flash-Lite yang dioptimalkan untuk respons cepat dan memerlukan environment variable `GEMINI_API_KEY`. Untuk memilih model lain, atur `GEMINI_MODEL`. Tanpa key, fitur koleksi, playlist, jurnal, dan insights tetap bisa digunakan.

## Fitur

- CRUD koleksi lagu dengan genre, tahun, dan catatan mood.
- CRUD playlist, kelola lagu di playlist, serta ubah urutan lagu.
- Jurnal mood dengan energi dan tautan ke lagu.
- Ringkasan statistik koleksi, playlist, artis, genre, dan jurnal.
- Rekomendasi musik beragam dari luar koleksi, rancangan playlist, dan penjelasan tema lagu melalui Gemini.
- Pratinjau audio iTunes dan pemutaran video YouTube langsung di halaman.
- Pembuatan soundscape ambient yang diputar melalui Web Audio API.

`YOUTUBE_API_KEY` bersifat opsional: jika tersedia, aplikasi menggunakan YouTube Data API; jika tidak, aplikasi mencari video melalui hasil publik YouTube. Jika API gagal, aplikasi tetap mencoba pencarian publik dan menyediakan tautan pencarian. Kegagalan pratinjau iTunes tidak menghalangi pencarian atau pemutaran YouTube. Versi Spring MVC ini dirancang untuk penggunaan lokal satu pengguna. Database lama berbasis PostgreSQL/Firebase tidak dimigrasikan otomatis; atur koneksi database baru dan migrasikan datanya secara terpisah bila diperlukan.

Source React/TypeScript versi sebelumnya masih disimpan sebagai referensi dan tidak dijalankan oleh Maven. Login Firebase serta kontrol antrean player lama belum dipindahkan ke versi Java.
