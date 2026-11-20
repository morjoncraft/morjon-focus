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

const COMBINED_REGEX =
  /\s+(\d+)\s*(?:saat|sa|hrs?|h|s)\s+(\d+)\s*(?:dakika|dak|dk|mins?|m)$/i;
const DECIMAL_HOURS_REGEX = /\s+(\d+[.,]\d+)\s*(?:saat|sa|hrs?|h|s)$/i;
const HOURS_ONLY_REGEX = /\s+(\d+)\s*(?:saat|sa|hrs?|h|s)$/i;
const MINUTES_ONLY_REGEX = /\s+(\d+)\s*(?:dakika|dak|dk|mins?|m)$/i;
const BARE_TRAILING_MINUTES_REGEX = /\s+[~+]?(\d{1,3})$/;

export function parseTaskInput(
  rawInput: string,
  fallbackMinutes = 25,
  smartTimeDetection = true,
): ParsedTaskInput {
  const trimmed = rawInput.trim();
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
  if (combinedMatch) {
    const hours = Number.parseInt(combinedMatch[1], 10);
    const mins = Number.parseInt(combinedMatch[2], 10);
    if (Number.isFinite(hours) && Number.isFinite(mins)) {
      totalMinutes = hours * 60 + mins;
      title = trimmed.slice(0, combinedMatch.index).trim();
    }
  } else {
    const decimalMatch = trimmed.match(DECIMAL_HOURS_REGEX);
    if (decimalMatch) {
      const hours = Number.parseFloat(decimalMatch[1].replace(',', '.'));
      if (Number.isFinite(hours)) {
        totalMinutes = Math.round(hours * 60);
        title = trimmed.slice(0, decimalMatch.index).trim();
      }
    } else {
      const hoursMatch = trimmed.match(HOURS_ONLY_REGEX);
      if (hoursMatch) {
        const hours = Number.parseInt(hoursMatch[1], 10);
        if (Number.isFinite(hours)) {
          totalMinutes = hours * 60;
          title = trimmed.slice(0, hoursMatch.index).trim();
        }
      } else {
        const minsMatch = trimmed.match(MINUTES_ONLY_REGEX);
        if (minsMatch) {
          const mins = Number.parseInt(minsMatch[1], 10);
          if (Number.isFinite(mins)) {
            totalMinutes = mins;
            title = trimmed.slice(0, minsMatch.index).trim();
          }
        } else {
          // Support bare trailing minutes like "My task 10" (Screenshot 4)
          const bareMatch = trimmed.match(BARE_TRAILING_MINUTES_REGEX);
          if (bareMatch) {
            const mins = Number.parseInt(bareMatch[1], 10);
            if (Number.isFinite(mins) && mins >= 1 && mins <= 360) {
              totalMinutes = mins;
              title = trimmed.slice(0, bareMatch.index).trim();
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
