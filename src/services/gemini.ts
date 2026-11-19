import { GoogleGenAI, Type } from '@google/genai';
import type { SongRow } from '../db/schema.ts';
import type {
  GeneratedPlaylistDraft,
  LyricsThemeExplanation,
  MoodRecommendationResponse,
} from '../types/music.ts';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Kunci API Gemini belum tersedia di konfigurasi server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function summarizeLibrary(userSongs: SongRow[]) {
  if (userSongs.length === 0) {
    return 'Koleksi pribadi pengguna masih kosong.';
  }
  const capped = userSongs.slice(0, 60);
  return capped
    .map(
      (s) =>
        `ID:${s.id} | "${s.title}" oleh ${s.artist} | Genre: ${s.genre} | Tahun: ${s.releaseYear}${
          s.moodNote ? ` | Catatan: ${s.moodNote}` : ''
        }`
    )
    .join('\n');
}

export async function recommendSongsByMood(
  moodPrompt: string,
  userSongs: SongRow[]
): Promise<MoodRecommendationResponse> {
  const ai = getGeminiClient();
  const libraryText = summarizeLibrary(userSongs);

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Suasana hati / aktivitas pengguna: "${moodPrompt}"

Daftar lagu dalam koleksi pribadi pengguna saat ini:
${libraryText}

Tugas Anda:
Berikan 5 hingga 7 rekomendasi lagu yang paling cocok dengan suasana hati atau aktivitas tersebut.
Jika ada lagu di koleksi pribadi pengguna yang cocok, sertakan dengan source="library" dan isi songId sesuai ID yang tertera.
Selalu lengkapi juga dengan saran lagu nyata yang relevan (lagu baru di luar koleksi pengguna) dengan source="new" dan songId=null agar pengguna punya pilihan segar.
Gunakan Bahasa Indonesia yang natural, hangat, dan ringkas.`,
    config: {
      systemInstruction:
        'Anda adalah kurator musik editorial MoodTune. Selalu rekomendasikan lagu nyata yang benar-benar ada (bukan lagu fiktif). Jelaskan alasan kecocokan suasana hati tiap lagu dalam 1 kalimat ringkas berbahasa Indonesia.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          moodSummary: {
            type: Type.STRING,
            description: 'Ringkasan singkat suasana hati atau tema dalam 2-4 kata.',
          },
          curationNote: {
            type: Type.STRING,
            description: 'Catatan kurasi editorial singkat (1-2 kalimat) tentang arah musik untuk mood ini.',
          },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                source: {
                  type: Type.STRING,
                  description: 'Gunakan "library" jika berasal dari daftar koleksi pengguna, atau "new" jika saran baru.',
                },
                songId: {
                  type: Type.INTEGER,
                  nullable: true,
                  description: 'ID lagu jika source="library", atau null jika source="new".',
                },
                title: { type: Type.STRING },
                artist: { type: Type.STRING },
                genre: { type: Type.STRING },
                releaseYear: { type: Type.INTEGER },
                reason: {
                  type: Type.STRING,
                  description: 'Alasan singkat mengapa lagu ini cocok dengan mood pengguna.',
                },
              },
              required: ['source', 'title', 'artist', 'genre', 'releaseYear', 'reason'],
            },
          },
        },
        required: ['moodSummary', 'curationNote', 'recommendations'],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as MoodRecommendationResponse;

  const validLibraryIds = new Set(userSongs.map((s) => s.id));
  const sanitized = (parsed.recommendations || []).map((item) => {
    const isValidLib =
      item.source === 'library' &&
      typeof item.songId === 'number' &&
      validLibraryIds.has(item.songId);
    return {
      ...item,
      source: isValidLib ? ('library' as const) : ('new' as const),
      songId: isValidLib ? item.songId : null,
      releaseYear: Number(item.releaseYear) || 2020,
    };
  });

  return {
    moodSummary: parsed.moodSummary || moodPrompt,
    curationNote: parsed.curationNote || 'Kurasi lagu sesuai suasana hati Anda.',
    recommendations: sanitized,
  };
}

export async function generatePlaylistDraft(
  themePrompt: string,
  trackCount: number,
  userSongs: SongRow[]
): Promise<GeneratedPlaylistDraft> {
  const ai = getGeminiClient();
  const libraryText = summarizeLibrary(userSongs);
  const clampedCount = Math.min(Math.max(trackCount || 6, 4), 12);

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Tema atau aktivitas playlist yang diminta: "${themePrompt}"
Jumlah lagu yang diinginkan: ${clampedCount} lagu.

Koleksi pribadi pengguna saat ini:
${libraryText}

Tugas Anda:
Susun satu rancangan playlist utuh yang mengalir secara emosional dan musikal.
Prioritaskan menggabungkan lagu yang cocok dari koleksi pribadi pengguna (source="library", songId sesuai ID) dengan saran lagu nyata baru yang saling melengkapi (source="new", songId=null).
Pilih juga coverVariant yang paling mewakili suasana: "focus" (tenang/fokus/minimalis), "rain" (melankolis/hujan/malam/reflektif), atau "morning" (energik/cerah/semangat).`,
    config: {
      systemInstruction:
        'Anda adalah kurator playlist MoodTune. Buat judul playlist yang puitis namun jelas, deskripsi editorial singkat, dan susunan lagu nyata yang kohesif dalam Bahasa Indonesia.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: 'Nama playlist yang menarik dan relevan dengan tema.',
          },
          description: {
            type: Type.STRING,
            description: 'Deskripsi singkat playlist (1-2 kalimat).',
          },
          moodTag: {
            type: Type.STRING,
            description: 'Label mood singkat (2-3 kata, mis. "Fokus Tenang" atau "Hujan Senja").',
          },
          coverVariant: {
            type: Type.STRING,
            description: 'Salah satu dari: "focus", "rain", atau "morning".',
          },
          tracks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                source: { type: Type.STRING },
                songId: { type: Type.INTEGER, nullable: true },
                title: { type: Type.STRING },
                artist: { type: Type.STRING },
                genre: { type: Type.STRING },
                releaseYear: { type: Type.INTEGER },
                reason: { type: Type.STRING },
              },
              required: ['source', 'title', 'artist', 'genre', 'releaseYear', 'reason'],
            },
          },
        },
        required: ['name', 'description', 'moodTag', 'coverVariant', 'tracks'],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as GeneratedPlaylistDraft;

  const validLibraryIds = new Set(userSongs.map((s) => s.id));
  const variant =
    parsed.coverVariant === 'rain' || parsed.coverVariant === 'morning'
      ? parsed.coverVariant
      : 'focus';

  return {
    name: parsed.name || `Playlist: ${themePrompt}`,
    description: parsed.description || 'Playlist kurasi otomatis oleh MoodTune AI.',
    moodTag: parsed.moodTag || themePrompt,
    coverVariant: variant,
    tracks: (parsed.tracks || []).map((item) => {
      const isValidLib =
        item.source === 'library' &&
        typeof item.songId === 'number' &&
        validLibraryIds.has(item.songId);
      return {
        ...item,
        source: isValidLib ? ('library' as const) : ('new' as const),
        songId: isValidLib ? item.songId : null,
        releaseYear: Number(item.releaseYear) || 2020,
      };
    }),
  };
}

export async function explainSongLyricsTheme(
  title: string,
  artist: string,
  genre?: string
): Promise<LyricsThemeExplanation> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Jelaskan tema, makna umum, dan nuansa emosional dari lagu berikut:
Judul: "${title}"
Artis: "${artist}"${genre ? `\nGenre: ${genre}` : ''}

Catatan penting: Jangan menyalin atau menuliskan lirik lagu berhak cipta secara penuh. Fokus pada analisis tema secara umum, pesan utama, metafora atau simbol yang menonjol, serta kapan lagu ini paling pas didengarkan. Gunakan Bahasa Indonesia yang jernih dan editorial.`,
    config: {
      systemInstruction:
        'Anda adalah analis musik dan kurator lirik MoodTune. Berikan penjelasan makna dan tema lagu secara umum, informatif, empatik, tanpa mereproduksi teks lirik berhak cipta.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          artist: { type: Type.STRING },
          coreTheme: {
            type: Type.STRING,
            description: 'Tema utama lagu dalam frasa singkat (mis. "Kerinduan dan Penerimaan").',
          },
          emotionalTone: {
            type: Type.STRING,
            description: 'Nuansa emosional lagu (mis. "Hangat, reflektif, sedikit melankolis").',
          },
          meaningOverview: {
            type: Type.STRING,
            description: 'Penjelasan makna umum lagu dalam 2-3 paragraf ringkas yang mudah dipahami.',
          },
          keyMotifs: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 sampai 4 motif, metafora, atau sudut pandang emosional utama dalam lagu.',
          },
          listeningContext: {
            type: Type.STRING,
            description: 'Rekomendasi momen atau aktivitas yang paling cocok untuk mendengarkan lagu ini.',
          },
        },
        required: [
          'title',
          'artist',
          'coreTheme',
          'emotionalTone',
          'meaningOverview',
          'keyMotifs',
          'listeningContext',
        ],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as LyricsThemeExplanation;

  return {
    title: parsed.title || title,
    artist: parsed.artist || artist,
    coreTheme: parsed.coreTheme || 'Refleksi Emosional',
    emotionalTone: parsed.emotionalTone || 'Kontemplatif',
    meaningOverview:
      parsed.meaningOverview || 'Penjelasan tema lagu tidak tersedia saat ini.',
    keyMotifs: Array.isArray(parsed.keyMotifs) ? parsed.keyMotifs : [],
    listeningContext:
      parsed.listeningContext || 'Cocok didengarkan saat bersantai atau merenung.',
  };
}
