# MoodTune

MoodTune adalah aplikasi web Java dengan Spring Boot, Spring MVC, Thymeleaf, dan JPA.

## Menjalankan aplikasi

Persyaratan: Java 17 atau lebih baru dan Maven.

```powershell
mvn spring-boot:run
```

Buka `http://localhost:8080`. Data disimpan secara lokal di folder `data/` menggunakan H2. Untuk PostgreSQL, atur `DATABASE_URL`, `DATABASE_USERNAME`, dan `DATABASE_PASSWORD`.

Fitur AI memakai Gemini dan memerlukan environment variable `GEMINI_API_KEY`. Tanpa key, fitur koleksi, playlist, jurnal, dan insights tetap bisa digunakan.

## Fitur

- CRUD koleksi lagu dengan genre, tahun, dan catatan mood.
- CRUD playlist, kelola lagu di playlist, serta ubah urutan lagu.
- Jurnal mood dengan energi dan tautan ke lagu.
- Ringkasan statistik koleksi, playlist, artis, genre, dan jurnal.
- Rekomendasi musik, rancangan playlist, dan penjelasan tema lagu melalui Gemini.
- Pratinjau audio iTunes dan pencarian video YouTube.
- Pembuatan soundscape ambient yang diputar melalui Web Audio API.

Pencarian video langsung memerlukan `YOUTUBE_API_KEY`; tanpa key aplikasi tetap menyediakan tautan pencarian YouTube. Versi Spring MVC ini dirancang untuk penggunaan lokal satu pengguna. Database lama berbasis PostgreSQL/Firebase tidak dimigrasikan otomatis; atur koneksi database baru dan migrasikan datanya secara terpisah bila diperlukan.

Source React/TypeScript versi sebelumnya masih disimpan sebagai referensi dan tidak dijalankan oleh Maven. Login Firebase serta kontrol antrean player lama belum dipindahkan ke versi Java.
