import type { YouTubeCandidate, YouTubeSearchResult } from '../types/music.ts';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

interface RawVideoItem {
  videoId: string;
  title: string;
  channel: string;
  durationText?: string;
  durationSeconds?: number;
}

function parseDurationToSeconds(text?: string): number | undefined {
  if (!text) return undefined;
  const parts = text
    .trim()
    .split(/[:.]/)
    .map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return undefined;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return undefined;
}

function scoreCandidate(
  item: RawVideoItem,
  songTitle: string,
  artist: string
): number {
  const titleLower = item.title.toLowerCase();
  const channelLower = item.channel.toLowerCase();
  const songLower = songTitle.toLowerCase();
  const artistLower = artist.toLowerCase();

  let score = 0;

  if (titleLower.includes(songLower)) score += 30;
  if (artistLower && (titleLower.includes(artistLower) || channelLower.includes(artistLower))) {
    score += 25;
  }
  if (titleLower.includes('official audio')) score += 22;
  if (titleLower.includes('official lyric')) score += 20;
  if (channelLower.includes('- topic')) score += 18;
  if (titleLower.includes('official music video') || titleLower.includes('official video')) {
    score += 14;
  }
  if (titleLower.includes('lirik') || titleLower.includes('lyrics')) score += 8;

  // Penalize covers, karaoke, slowed/reverb, 1-hour mixes, playlists, shorts
  if (
    titleLower.includes('karaoke') ||
    titleLower.includes('instrumental') ||
    titleLower.includes('cover') ||
    titleLower.includes('nightcore') ||
    titleLower.includes('slowed') ||
    titleLower.includes('sped up') ||
    titleLower.includes('reaction') ||
    titleLower.includes('tutorial') ||
    titleLower.includes('full album') ||
    titleLower.includes('playlist') ||
    titleLower.includes('compilation') ||
    titleLower.includes('satu jam') ||
    titleLower.includes('1 jam') ||
    titleLower.includes('1 hour')
  ) {
    score -= 35;
  }

  if (item.durationSeconds !== undefined) {
    if (item.durationSeconds < 50) score -= 50; // Shorts / snippets
    else if (item.durationSeconds > 720) score -= 45; // Long mix > 12 mins
    else if (item.durationSeconds >= 90 && item.durationSeconds <= 480) score += 10;
  } else {
    // Likely a live stream
    score -= 30;
  }

  return score;
}

async function isOembedAvailable(videoId: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    return res.ok;
  } catch {
    return true; // Do not block on transient timeout; YT IFrame will try anyway
  }
}

async function searchWithYouTubeDataApi(
  query: string,
  apiKey: string
): Promise<RawVideoItem[]> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&videoCategoryId=10&maxResults=8&q=${encodeURIComponent(
    query
  )}&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url);
  if (!res.ok) {
    return [];
  }
  const json = (await res.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: { title?: string; channelTitle?: string };
    }>;
  };

  return (json.items || [])
    .filter((item) => Boolean(item.id?.videoId))
    .map((item) => ({
      videoId: item.id!.videoId!,
      title: item.snippet?.title || 'Video YouTube',
      channel: item.snippet?.channelTitle || 'YouTube',
      durationSeconds: 240,
    }));
}

async function searchYouTubePublic(query: string): Promise<RawVideoItem[]> {
  const res = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    }
  );
  if (!res.ok) return [];

  const html = await res.text();
  const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
  if (!match) return [];

  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return [];
  }

  const found: RawVideoItem[] = [];
  const seen = new Set<string>();

  function walk(node: unknown) {
    if (!node || typeof node !== 'object' || found.length >= 14) return;
    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
        if (found.length >= 14) break;
      }
      return;
    }

    const record = node as Record<string, unknown>;
    const vr = record.videoRenderer as
      | {
          videoId?: string;
          title?: { runs?: Array<{ text?: string }> };
          ownerText?: { runs?: Array<{ text?: string }> };
          lengthText?: { simpleText?: string };
        }
      | undefined;

    if (vr?.videoId && !seen.has(vr.videoId)) {
      seen.add(vr.videoId);
      const durationText = vr.lengthText?.simpleText;
      found.push({
        videoId: vr.videoId,
        title: (vr.title?.runs || []).map((r) => r.text || '').join('') || 'YouTube Video',
        channel: vr.ownerText?.runs?.[0]?.text || 'YouTube',
        durationText,
        durationSeconds: parseDurationToSeconds(durationText),
      });
      return;
    }

    for (const key of Object.keys(record)) {
      walk(record[key]);
      if (found.length >= 14) break;
    }
  }

  walk(data);
  return found;
}

export async function findYouTubeCandidates(
  title: string,
  artist: string
): Promise<YouTubeSearchResult> {
  const query = artist ? `${title} ${artist} official audio` : `${title} audio`;
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();

  let rawItems: RawVideoItem[] = [];
  if (apiKey) {
    rawItems = await searchWithYouTubeDataApi(query, apiKey);
  }
  if (rawItems.length === 0) {
    rawItems = await searchYouTubePublic(query);
  }
  if (rawItems.length === 0 && artist) {
    rawItems = await searchYouTubePublic(`${title} ${artist}`);
  }

  if (rawItems.length === 0) {
    return {
      found: false,
      candidates: [],
      message: 'Video YouTube untuk lagu ini tidak ditemukan.',
    };
  }

  const ranked = [...rawItems]
    .sort((a, b) => scoreCandidate(b, title, artist) - scoreCandidate(a, title, artist))
    .slice(0, 6);

  const checks = await Promise.all(
    ranked.map(async (item) => ({
      item,
      ok: await isOembedAvailable(item.videoId),
    }))
  );

  const valid = checks.filter((c) => c.ok).map((c) => c.item);
  const chosen = (valid.length > 0 ? valid : ranked).slice(0, 5);

  const candidates: YouTubeCandidate[] = chosen.map((item) => ({
    videoId: item.videoId,
    title: item.title,
    channel: item.channel,
    durationText: item.durationText,
    watchUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
  }));

  return {
    found: candidates.length > 0,
    candidates,
  };
}
