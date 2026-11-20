export interface ParsedTaskInput {
  title: string;
  durationSeconds: number;
  hasExplicitDuration: boolean;
  suggestedEmoji: string;
}

const KEYWORD_EMOJI_RULES: Array<[RegExp, string]> = [
  [/junit|kod|code|react|typescript|ts|js|api|git|bug|debug|yazılım|dev|build|test|deploy|python|java|css/i, '💻'],
  [/ders|sınav|oku|kitap|not|öğren|video|izle|kurs|makale|çalış|ödev|lecture|study|read|exam|course/i, '📚'],
  [/mail|eposta|e-posta|mesaj|yanıt|inbox|dm|ileti|email|reply/i, '✉️'],
  [/toplantı|görüşme|sunum|zoom|meet|call|arama|konuş|sync|standup/i, '🗣️'],
  [/spor|egzersiz|yürüyüş|koşu|gym|yoga|esneme|antrenman|workout|run|walk|stretch/i, '🏃'],
  [/kahve|çay|mola|dinlen|yemek|kahvaltı|öğle|akşam|ara|coffee|tea|break|lunch|dinner/i, '☕'],
  [/su\b|içecek|vitamin|water|hydrate/i, '💧'],
  [/temiz|düzenle|topla|ev|çamaşır|bulaşık|masa|clean|tidy|laundry|organize/i, '🧹'],
  [/tasarım|figma|ui|ux|renk|çizim|ikon|logo|design|sketch|art/i, '🎨'],
  [/müzik|dinle|podcast|ses|music|listen|audio/i, '🎧'],
  [/yazı|blog|rapor|doküman|belge|döküman|write|draft|report|doc/i, '✍️'],
  [/plan|rutin|hedef|günlük|liste|strateji|goal|routine|review|roadmap/i, '🎯'],
  [/market|alışveriş|shop|grocery|buy/i, '🛒'],
  [/uyku|sleep|nap/i, '😴'],
];

export function suggestEmojiForTitle(title: string): string {
  const clean = title.trim();
  if (!clean) return '⚡';
  for (const [pattern, emoji] of KEYWORD_EMOJI_RULES) {
    if (pattern.test(clean)) {
      return emoji;
    }
  }
  return '⚡';
}

const LEADING_BULLET_REGEX = /^\s*(?:[-*•▪▸]+|\d+[.)])\s+/;
const TRAILING_SEPARATOR_REGEX = /[-–—:\s]+$/;

const COMBINED_REGEX =
  /(?:\s+[-–—:]?\s*)\(?(\d+)\s*(?:saat|sa|hrs?|hr|h|s)\s+(\d+)\s*(?:dakika|dak|dk|mins?|min|m)\)?$/i;
const DECIMAL_HOURS_REGEX =
  /(?:\s+[-–—:]?\s*)\(?(\d+[.,]\d+)\s*(?:saat|sa|hrs?|hr|h|s)\)?$/i;
const HOURS_ONLY_REGEX =
  /(?:\s+[-–—:]?\s*)\(?(\d+)\s*(?:saat|sa|hrs?|hr|h|s)\)?$/i;
const MINUTES_ONLY_REGEX =
  /(?:\s+[-–—:]?\s*)\(?(\d+)\s*(?:dakika|dak|dk|mins?|min|m)\)?$/i;
const BARE_TRAILING_MINUTES_REGEX = /\s+[~+]?(\d{1,3})$/;

// Inline multi-task splitter: matches unit-bearing duration tokens preceded by non-empty title text
const INLINE_DURATION_SPLIT_REGEX =
  /(?:\s+[-–—:]?\s*)\(?(?:(\d+)\s*(?:saat|sa|hrs?|hr|h|s)\s+(\d+)\s*(?:dakika|dak|dk|mins?|min|m)|(\d+[.,]\d+)\s*(?:saat|sa|hrs?|hr|h|s)|(\d+)\s*(?:saat|sa|hrs?|hr|h|s|dakika|dak|dk|mins?|min|m))\)?(?=\s|$)/gi;

function stripLeadingBullet(text: string): string {
  return text.replace(LEADING_BULLET_REGEX, '').trim();
}

export function normalizeMultiLinePaste(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => stripLeadingBullet(line))
    .filter((line) => line.length > 0)
    .join(' ; ');
}

function splitInlineDurationSegments(line: string): string[] {
  const cleanLine = stripLeadingBullet(line);
  if (!cleanLine) return [];

  const regex = new RegExp(INLINE_DURATION_SPLIT_REGEX.source, 'gi');
  const segments: string[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleanLine)) !== null) {
    const candidateTitle = cleanLine
      .slice(cursor, match.index)
      .replace(TRAILING_SEPARATOR_REGEX, '')
      .trim();

    if (candidateTitle.length === 0) {
      continue;
    }

    const endIdx = match.index + match[0].length;
    const segment = cleanLine.slice(cursor, endIdx).trim();
    if (segment) {
      segments.push(segment);
    }
    cursor = endIdx;
  }

  const tail = cleanLine.slice(cursor).trim();
  if (tail.length > 0) {
    segments.push(tail);
  }

  return segments.length > 0 ? segments : [cleanLine];
}

export function parseTaskInput(
  rawInput: string,
  fallbackMinutes = 25,
  smartTimeDetection = true,
): ParsedTaskInput {
  const trimmed = stripLeadingBullet(rawInput);
  if (!trimmed) {
    return {
      title: '',
      durationSeconds: fallbackMinutes * 60,
      hasExplicitDuration: false,
      suggestedEmoji: '⚡',
    };
  }

  if (!smartTimeDetection) {
    return {
      title: trimmed,
      durationSeconds: Math.max(1, fallbackMinutes) * 60,
      hasExplicitDuration: false,
      suggestedEmoji: suggestEmojiForTitle(trimmed),
    };
  }

  let title = trimmed;
  let totalMinutes: number | null = null;

  const combinedMatch = trimmed.match(COMBINED_REGEX);
  if (combinedMatch && combinedMatch.index !== undefined) {
    const hours = Number.parseInt(combinedMatch[1], 10);
    const mins = Number.parseInt(combinedMatch[2], 10);
    if (Number.isFinite(hours) && Number.isFinite(mins)) {
      totalMinutes = hours * 60 + mins;
      title = trimmed.slice(0, combinedMatch.index).replace(TRAILING_SEPARATOR_REGEX, '').trim();
    }
  } else {
    const decimalMatch = trimmed.match(DECIMAL_HOURS_REGEX);
    if (decimalMatch && decimalMatch.index !== undefined) {
      const hours = Number.parseFloat(decimalMatch[1].replace(',', '.'));
      if (Number.isFinite(hours)) {
        totalMinutes = Math.round(hours * 60);
        title = trimmed.slice(0, decimalMatch.index).replace(TRAILING_SEPARATOR_REGEX, '').trim();
      }
    } else {
      const hoursMatch = trimmed.match(HOURS_ONLY_REGEX);
      if (hoursMatch && hoursMatch.index !== undefined) {
        const hours = Number.parseInt(hoursMatch[1], 10);
        if (Number.isFinite(hours)) {
          totalMinutes = hours * 60;
          title = trimmed.slice(0, hoursMatch.index).replace(TRAILING_SEPARATOR_REGEX, '').trim();
        }
      } else {
        const minsMatch = trimmed.match(MINUTES_ONLY_REGEX);
        if (minsMatch && minsMatch.index !== undefined) {
          const mins = Number.parseInt(minsMatch[1], 10);
          if (Number.isFinite(mins)) {
            totalMinutes = mins;
            title = trimmed.slice(0, minsMatch.index).replace(TRAILING_SEPARATOR_REGEX, '').trim();
          }
        } else {
          // Support bare trailing minutes like "My task 10"
          const bareMatch = trimmed.match(BARE_TRAILING_MINUTES_REGEX);
          if (bareMatch && bareMatch.index !== undefined) {
            const mins = Number.parseInt(bareMatch[1], 10);
            if (Number.isFinite(mins) && mins >= 1 && mins <= 360) {
              totalMinutes = mins;
              title = trimmed.slice(0, bareMatch.index).replace(TRAILING_SEPARATOR_REGEX, '').trim();
            }
          }
        }
      }
    }
  }

  const hasExplicitDuration = totalMinutes !== null && title.length > 0;
  const effectiveMinutes = hasExplicitDuration
    ? Math.max(1, Math.min(720, totalMinutes as number))
    : Math.max(1, fallbackMinutes);

  const finalTitle = title.length > 0 ? title : trimmed;

  return {
    title: finalTitle,
    durationSeconds: effectiveMinutes * 60,
    hasExplicitDuration,
    suggestedEmoji: suggestEmojiForTitle(finalTitle),
  };
}

export function parseBulkTaskInput(
  rawInput: string,
  fallbackMinutes = 25,
  smartTimeDetection = true,
): ParsedTaskInput[] {
  if (!rawInput.trim()) return [];

  const coarseLines = rawInput
    .split(/\r?\n|;/)
    .map((line) => stripLeadingBullet(line))
    .filter((line) => line.length > 0);

  if (!smartTimeDetection) {
    return coarseLines
      .map((line) => parseTaskInput(line, fallbackMinutes, false))
      .filter((item) => item.title.length > 0);
  }

  const segments: string[] = [];
  for (const line of coarseLines) {
    segments.push(...splitInlineDurationSegments(line));
  }

  return segments
    .map((seg) => parseTaskInput(seg, fallbackMinutes, smartTimeDetection))
    .filter((item) => item.title.length > 0);
}
