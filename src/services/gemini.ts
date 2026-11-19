import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { SongRow } from '../db/schema.ts';
import type {
  GeneratedPlaylistDraft,
  LyricsThemeExplanation,
  MoodRecommendationResponse,
  SoundscapeBlueprint,
} from '../types/music.ts';

export class GeminiServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'GeminiServiceError';
    this.statusCode = statusCode;
  }
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiServiceError(
      'Kunci API Gemini belum dikonfigurasi di Secrets server.',
      500
    );
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

function extractErrorDetails(err: unknown): {
  code?: number;
  status?: string;
  message: string;
} {
  const rawMessage = err instanceof Error ? err.message : String(err ?? '');
  const numericStatus =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: unknown }).status)
      : undefined;

  // Try parsing JSON embedded in error message (common from @google/genai ApiError)
  const jsonStart = rawMessage.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(rawMessage.slice(jsonStart)) as {
        error?: { code?: number; status?: string; message?: string };
      };
      if (parsed?.error) {
        return {
          code: parsed.error.code || numericStatus,
          status: parsed.error.status,
          message: parsed.error.message || rawMessage,
        };
      }
    } catch {
      // Ignore JSON parse fallback
    }
  }

  return {
    code: Number.isFinite(numericStatus) ? numericStatus : undefined,
    message: rawMessage,
  };
}

function isTransientError(err: unknown): boolean {
  const details = extractErrorDetails(err);
  if (details.code === 503 || details.code === 500 || details.code === 429) {
    return true;
  }
  const msg = details.message.toLowerCase();
  return (
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('temporarily') ||
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout')
  );
}

function toGeminiServiceError(err: unknown): GeminiServiceError {
  if (err instanceof GeminiServiceError) return err;

  const details = extractErrorDetails(err);
  const code = details.code;
  const msg = details.message.toLowerCase();

  if (code === 503 || details.status === 'UNAVAILABLE' || msg.includes('high demand')) {
    return new GeminiServiceError(
      'Layanan AI sedang mengalami lonjakan permintaan sementara (503). Sistem sudah mencoba ulang otomatis—silakan klik Coba Lagi beberapa saat lagi.',
      503,
      { cause: err }
    );
  }

  if (code === 429 || details.status === 'RESOURCE_EXHAUSTED') {
    return new GeminiServiceError(
      'Batas kuota permintaan AI sementara tercapai (429). Silakan tunggu sebentar sebelum mencoba lagi.',
      429,
      { cause: err }
    );
  }

  if (code === 403 || code === 400 || msg.includes('api_key_invalid')) {
    return new GeminiServiceError(
      'Konfigurasi kunci API Gemini tidak valid atau belum memiliki izin. Periksa panel Settings > Secrets.',
      code || 400,
      { cause: err }
    );
  }

  return new GeminiServiceError(
    'Terjadi kendala saat menghubungi layanan AI. Silakan coba lagi.',
    code && code >= 400 && code < 600 ? code : 502,
    { cause: err }
  );
}

async function generateWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !isTransientError(err)) {
        throw toGeminiServiceError(err);
      }
      const baseDelay = 900 * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 400);
      await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
    }
  }

  throw toGeminiServiceError(lastError);
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

  const response = await generateWithRetry(() =>
    ai.models.generateContent({
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
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
              description:
                'Catatan kurasi editorial singkat (1-2 kalimat) tentang arah musik untuk mood ini.',
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: {
                    type: Type.STRING,
                    description:
                      'Gunakan "library" jika berasal dari daftar koleksi pengguna, atau "new" jika saran baru.',
                  },
                  songId: {
                    type: Type.INTEGER,
                    nullable: true,
                    description:
                      'ID lagu jika source="library", atau null jika source="new".',
                  },
                  title: { type: Type.STRING },
                  artist: { type: Type.STRING },
                  genre: { type: Type.STRING },
                  releaseYear: { type: Type.INTEGER },
                  reason: {
                    type: Type.STRING,
                    description:
                      'Alasan singkat mengapa lagu ini cocok dengan mood pengguna.',
                  },
                },
                required: [
                  'source',
                  'title',
                  'artist',
                  'genre',
                  'releaseYear',
                  'reason',
                ],
              },
            },
          },
          required: ['moodSummary', 'curationNote', 'recommendations'],
        },
      },
    })
  );

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

  const response = await generateWithRetry(() =>
    ai.models.generateContent({
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
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
              description:
                'Label mood singkat (2-3 kata, mis. "Fokus Tenang" atau "Hujan Senja").',
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
                required: [
                  'source',
                  'title',
                  'artist',
                  'genre',
                  'releaseYear',
                  'reason',
                ],
              },
            },
          },
          required: ['name', 'description', 'moodTag', 'coverVariant', 'tracks'],
        },
      },
    })
  );

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

  const response = await generateWithRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Jelaskan tema, makna umum, dan nuansa emosional dari lagu berikut:
Judul: "${title}"
Artis: "${artist}"${genre ? `\nGenre: ${genre}` : ''}

Catatan penting: Jangan menyalin atau menuliskan lirik lagu berhak cipta secara penuh. Fokus pada analisis tema secara umum, pesan utama, metafora atau simbol yang menonjol, serta kapan lagu ini paling pas didengarkan. Gunakan Bahasa Indonesia yang jernih dan editorial.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
              description:
                'Tema utama lagu dalam frasa singkat (mis. "Kerinduan dan Penerimaan").',
            },
            emotionalTone: {
              type: Type.STRING,
              description:
                'Nuansa emosional lagu (mis. "Hangat, reflektif, sedikit melankolis").',
            },
            meaningOverview: {
              type: Type.STRING,
              description:
                'Penjelasan makna umum lagu dalam 2-3 paragraf ringkas yang mudah dipahami.',
            },
            keyMotifs: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                '3 sampai 4 motif, metafora, atau sudut pandang emosional utama dalam lagu.',
            },
            listeningContext: {
              type: Type.STRING,
              description:
                'Rekomendasi momen atau aktivitas yang paling cocok untuk mendengarkan lagu ini.',
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
    })
  );

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

export async function composeMoodSoundscape(input: {
  moodOrPrompt: string;
  title?: string;
  artist?: string;
  genre?: string;
}): Promise<SoundscapeBlueprint> {
  const ai = getGeminiClient();
  const contextLine = input.title
    ? `Lagu referensi: "${input.title}" oleh ${input.artist || 'Artis'} (${input.genre || 'Umum'}). Suasana: ${input.moodOrPrompt}`
    : `Suasana hati / tema: "${input.moodOrPrompt}"`;

  const response = await generateWithRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Rancang komposisi musik latar instrumental (ambient/lo-fi/akustik) untuk dimainkan di Web Audio synthesizer browser berdasarkan konteks berikut:
${contextLine}

Aturan musikalisasi:
- Pilih tempo BPM antara 60 (tenang/sedih) hingga 116 (energik/cerah).
- Pilih waveform yang sesuai: "warm-pad" (hangat/ambient/hujan), "sine" (lembut/fokus/melankolis), atau "triangle" (cerah/lo-fi/energik).
- Buat tepat 4 akor harmonis yang mengalir enak secara musikal.
- Untuk setiap akor:
  - frequencies: 3 sampai 4 frekuensi nada akor dalam Hz (rentang oktaf 3–4, sekitar 130 Hz – 440 Hz).
  - melodyFrequencies: 4 frekuensi nada melodi lembut dalam Hz yang harmonis dengan akor tersebut (rentang 260 Hz – 780 Hz).
- Gunakan nama judul puitis dan deskripsi singkat dalam Bahasa Indonesia.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction:
          'Anda adalah komposer musik digital MoodTune. Hasilkan aransemen progresi 4 akor dengan frekuensi Hz yang akurat secara teori musik agar terdengar harmonis dan menenangkan saat dimainkan oleh synthesizer Web Audio.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            moodDescription: { type: Type.STRING },
            bpm: { type: Type.INTEGER },
            waveform: {
              type: Type.STRING,
              description: 'Salah satu dari: "sine", "triangle", atau "warm-pad".',
            },
            scaleName: { type: Type.STRING },
            chords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  frequencies: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                  },
                  melodyFrequencies: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                  },
                },
                required: ['name', 'frequencies', 'melodyFrequencies'],
              },
            },
          },
          required: [
            'title',
            'moodDescription',
            'bpm',
            'waveform',
            'scaleName',
            'chords',
          ],
        },
      },
    })
  );

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as SoundscapeBlueprint;

  const validWaveform =
    parsed.waveform === 'triangle' || parsed.waveform === 'warm-pad'
      ? parsed.waveform
      : 'sine';

  const fallbackChords = [
    {
      name: 'Fmaj7',
      frequencies: [174.61, 220.0, 261.63, 329.63],
      melodyFrequencies: [440.0, 523.25, 659.25, 523.25],
    },
    {
      name: 'G6',
      frequencies: [196.0, 246.94, 293.66, 329.63],
      melodyFrequencies: [493.88, 587.33, 659.25, 493.88],
    },
    {
      name: 'Em7',
      frequencies: [164.81, 196.0, 246.94, 293.66],
      melodyFrequencies: [392.0, 493.88, 587.33, 440.0],
    },
    {
      name: 'Am9',
      frequencies: [220.0, 261.63, 329.63, 493.88],
      melodyFrequencies: [523.25, 659.25, 493.88, 440.0],
    },
  ];

  return {
    title: parsed.title || 'Alunan Suasana Hati',
    moodDescription:
      parsed.moodDescription || 'Komposisi instrumental adaptif sesuai mood Anda.',
    bpm: Math.max(58, Math.min(132, Number(parsed.bpm) || 74)),
    waveform: validWaveform,
    scaleName: parsed.scaleName || 'A Minor',
    chords:
      Array.isArray(parsed.chords) && parsed.chords.length >= 2
        ? parsed.chords.slice(0, 6)
        : fallbackChords,
  };
}

