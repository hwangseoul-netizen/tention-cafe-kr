// src/slots/generate.ts
const pad2 = (n: number) => String(n).padStart(2, "0");

function parseHM(str: string) {
  if (!str || !/^\d{2}:\d{2}$/.test(str)) return null;
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}
function addMin(startHM: string, delta: number) {
  const m = (parseHM(startHM) || 0) + delta;
  const mm = ((m % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(mm / 60))}:${pad2(mm % 60)}`;
}
function spanMins(start: string, end: string) {
  const s = parseHM(start), e = parseHM(end);
  if (s == null || e == null) return 10;
  let d = e - s;
  if (d <= 0) d += 1440;
  return d;
}
function guessBandFromStart(hm: string) {
  const m = parseHM(hm) || 0;
  const h = Math.floor(m / 60);
  if (h < 9) return "이른 아침";
  if (h < 12) return "오전";
  if (h < 15) return "점심";
  if (h < 19) return "오후";
  if (h < 22) return "저녁";
  return "심야";
}

const DUR_OPTS = [10,20,30,40,50,60,70,80,90,100,110,120] as const;

const BAND_ANCHOR: Record<string,string> = {
  "이른 아침":"06:30",
  "오전":"10:00",
  "점심":"13:00",
  "오후":"16:00",
  "저녁":"19:30",
  "심야":"22:30",
};

const CITY_LIST = [
  {code:"GN",  name:"강남/역삼"},
  {code:"HD",  name:"홍대/합정"},
  {code:"JS",  name:"잠실/석촌"},
  {code:"GS",  name:"성수/건대"},
  {code:"YD",  name:"여의도"},
  {code:"SEO", name:"서울(기타)"},
  {code:"SUW", name:"수원"},
  {code:"GGN", name:"경기 북부"},
  {code:"GGS", name:"경기 남부"},
  {code:"ICN", name:"인천/송도"},
] as const;

const CITY: Record<string,string> = Object.fromEntries(CITY_LIST.map(c=>[c.code,c.name]));
const cityName = (code: string) => CITY[code] || code;

const CATS = ["Vibe","Friends","Try","Focus"] as const;

const TOPIC_POOL: Record<string, string[]> = {
  Vibe: [
    "요즘 설레는 것 한 가지", "호감이 생기는 매너", "‘편한 사람’의 특징",
    "취향 하나씩 교환", "나의 소소한 행복", "대화 잘 통하는 포인트",
  ],
  Friends: [
    "최근 제일 웃겼던 일", "실패담 하나(웃기게)", "밈/콘텐츠 추천",
    "주말 루틴 공유", "숨겨둔 카페 취향", "TMI 교환 10분",
  ],
  Try: [
    "2026 작은 실험 하나", "요즘 배우고 싶은 것", "새 루틴 추천",
    "관심사 한 줄 발표", "버킷리스트 교환", "MBTI 말고 나를 설명",
  ],
  Focus: [
    "커리어 고민 10분 압축", "이직/연봉/성장 고민", "프로젝트 진행상황",
    "생산성 도구 공유", "읽은 글/책 한 줄", "멘탈 관리 루틴",
  ],
};

const CAFE_DB = [
  // Brand (스벅 제외)
  { name:"투썸플레이스", type:"Brand", info:"좌석 넉넉 + 디저트" },
  { name:"할리스", type:"Brand", info:"대화 부담 적은 분위기" },
  { name:"폴바셋", type:"Brand", info:"조용-차분 라인" },
  { name:"메가커피(대형)", type:"Brand", info:"가성비 + 접근성" },

  // Hot(Private)
  { name:"힙한 개인카페", type:"Hot", info:"감성/무드, 대화 잘 풀림" },
  { name:"창고형 카페", type:"Hot", info:"테이블 넓음, 눈치 적음" },
  { name:"북카페", type:"Hot", info:"조용+정돈, 진지 토크 좋음" },

  // Room
  { name:"미팅룸 카페", type:"Room", info:"스터디룸/대형테이블 가능" },
  { name:"스터디 카페", type:"Room", info:"집중/프로젝트 토크 최적" },
] as const;

function weightedCafePick(){
  // Brand 0.55 / Hot 0.35 / Room 0.10
  const r = Math.random();
  const bucket = r<0.55 ? "Brand" : (r<0.90 ? "Hot" : "Room");
  const list = CAFE_DB.filter(x=>x.type===bucket);
  return list[Math.floor(Math.random()*list.length)];
}

export type SlotDoc = {
  type: "Vibe"|"Friends"|"Try"|"Focus";
  city: string;
  band: string;
  title: string;
  place: string;
  cafeType: "Brand"|"Hot"|"Room";
  cafeInfo: string;
  start: string;
  end: string;
  totalMins: number;
  minsLeft: number;
  attendees: string[];
  proofScore: number;
  createdAt: number;

  // 권장 인원 표시용
  recMin: number;
  recMax: number;
};

export function generateSlots200({ cities, band }: { cities: string[]; band: string }): SlotDoc[] {
  const base = cities.length ? cities : ["GN","HD","JS","GS","YD"];
  const per = Math.max(10, Math.floor(200 / base.length));
  const anchor = BAND_ANCHOR[band] || "19:30";

  const out: SlotDoc[] = [];
  for (const code of base) {
    for (let i=0;i<per;i++){
      const type = CATS[Math.floor(Math.random()*CATS.length)];
      const cafe = weightedCafePick();

      const d = DUR_OPTS[Math.floor(Math.random()*DUR_OPTS.length)];
      const start = addMin(anchor, 10 * Math.floor(Math.random()*18)); // 3시간 범위
      const end = addMin(start, d);

      const topic = TOPIC_POOL[type][Math.floor(Math.random()*TOPIC_POOL[type].length)];
      const place = `${cityName(code)} · ${cafe.name}`;

      const totalMins = spanMins(start, end);
      const minsLeft = Math.max(5, Math.floor(totalMins * 0.8));

      // 권장 인원: 기본 2-4 / Room은 4-10
      const recMin = cafe.type === "Room" ? 4 : 2;
      const recMax = cafe.type === "Room" ? 10 : 4;

      out.push({
        type,
        city: code,
        band: guessBandFromStart(start),
        title: topic,
        place,
        cafeType: cafe.type as any,
        cafeInfo: cafe.info,
        start,
        end,
        totalMins,
        minsLeft,
        attendees: [],
        proofScore: Math.round(3 + Math.random()*2),
        createdAt: Date.now() + Math.floor(Math.random()*1e6),
        recMin,
        recMax,
      });
    }
  }

  return out.slice(0, 200).sort((a,b)=>b.createdAt-a.createdAt);
}
