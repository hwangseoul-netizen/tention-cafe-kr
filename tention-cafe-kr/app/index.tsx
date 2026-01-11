import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

/**
 * ✅ Firebase (너 파일트리 기준)
 * - index.tsx: app/(tabs)/index.tsx
 * - firebase.ts: src/firebase/firebase.ts
 */
import { db } from "../src/firebase/firebase";

import {
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    setDoc,
    updateDoc,
    writeBatch,
} from "firebase/firestore";

/* ---- default export ---- */
export default function Screen() {
  return <Root />;
}

/* =========================
   Alert (Web-safe)
========================= */
const showAlert = (title: string, message?: string) => {
  if (Platform.OS === "web") {
    (globalThis as any).alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
};

/* =========================
   Copy
========================= */
const T = {
  app: "TENtion KR",
  my: "내 모임",
  create: "+ 만들기",
  searchPH: "주제/카페/도시/MBTI 검색…",
  sort: "정렬 기준",
  sortOpt: ["마감 임박", "최신순", "추천순"],
  timeBands: ["이른 아침", "오전", "점심", "오후", "저녁", "심야"],
  duration: "분",
  noSlotsT: "표시할 슬롯이 없어요",
  noSlotsS: "도시/시간대/시간(분)을 바꿔봐.",
  details: "자세히",
  checkin: "참여하기",
  arrive: "도착 체크인",
  seatless: "자리 없음",
  priority: "우선입장 신청",
  share: "공유",
  back: "← 뒤로",
  safetyNoteShort: "카페(공공장소) only · DM 금지 · 예의 필수 · 각자 결제",
  boundaryTitle: "TENtion 방침",
  boundaryBody:
    `• 텐션이 제공하는 만남은 “지정된 카페 + 지정된 시간” 기준이야.\n` +
    `• 시간 연장은 두 사람이 합의해서 자율적으로 결정할 수 있어.\n` +
    `• 지정 시간 이후/다른 장소로의 이동은 텐션 관리 범위 밖이야.`,
};

/* =========================
   Categories (4)
========================= */
const CATS = [
  { key: "Vibe", label: "Vibe", icon: "💞", color: "#FF5CAB" },
  { key: "Friends", label: "Friends", icon: "🤝", color: "#2EE778" },
  { key: "Focus", label: "Focus", icon: "📈", color: "#FFA23B" },
  { key: "Try", label: "Try", icon: "🧠", color: "#6AAEFF" },
] as const;

type CatKey = (typeof CATS)[number]["key"];

const catLabel = (k: string) => CATS.find((x) => x.key === k)?.label || k;
const catIcon = (k: string) => CATS.find((x) => x.key === k)?.icon || "💬";
const catColor = (k: string) => CATS.find((x) => x.key === k)?.color || "#6AAEFF";

/* =========================
   Cities
========================= */
const CITY_LIST = [
  { code: "GN", name: "강남/역삼", region: "서울" },
  { code: "HD", name: "홍대/합정", region: "서울" },
  { code: "JS", name: "잠실/석촌", region: "서울" },
  { code: "GS", name: "성수/건대", region: "서울" },
  { code: "YD", name: "여의도", region: "서울" },
  { code: "SEO", name: "서울(기타)", region: "서울" },
  { code: "SUW", name: "수원", region: "경기" },
  { code: "GGS", name: "경기 남부", region: "경기" },
  { code: "GGN", name: "경기 북부", region: "경기" },
  { code: "ICN", name: "인천/송도", region: "수도권" },
] as const;

const CITY = CITY_LIST.reduce((m, c) => {
  (m as any)[c.code] = c;
  return m;
}, {} as Record<string, (typeof CITY_LIST)[number]>);

const cityName = (code: string) => CITY[code]?.name || code;
const HOT5 = ["GN", "HD", "JS", "GS", "YD"];

/* =========================
   Constants
========================= */
const DUR_OPTS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const BAND_ANCHOR: Record<string, string> = {
  "이른 아침": "06:30",
  "오전": "10:00",
  "점심": "13:00",
  "오후": "16:00",
  "저녁": "19:30",
  "심야": "22:30",
};

/** ✅ 지금은 단순 문자열로 유저 표시(나중에 Auth uid로 교체하면 끝) */
const ME = "Me";

/* =========================
   Helpers
========================= */
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
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
  const s = parseHM(start),
    e = parseHM(end);
  if (s == null || e == null) return 10;
  let d = e - s;
  if (d <= 0) d += 1440;
  return d;
}
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));
const includes = (arr: any[] | undefined, v: any) => (arr || []).includes(v);

function buildTodayTs(hm: string) {
  const now = new Date();
  const [h, m] = hm.split(":").map(Number);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0).getTime();
}
function getState(nowMs: number, startHM: string, durMin: number) {
  const start = buildTodayTs(startHM);
  const end = start + (durMin || 10) * 60 * 1000;
  if (nowMs < start)
    return { state: "upcoming" as const, secsToStart: Math.floor((start - nowMs) / 1000) };
  if (nowMs <= end) return { state: "live" as const, secsToStart: 0 };
  return { state: "ended" as const, secsToStart: 0 };
}
function fmtHMS(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
const stars = (n: number) => (!n ? "⭐ —" : "⭐".repeat(Math.max(1, Math.min(5, Math.round(n)))));

/* =========================
   Cafe DB
========================= */
type CafeType = "Brand" | "Private" | "Room";

const CAFE_DB: Array<{ name: string; type: CafeType; info: string }> = [
  { name: "투썸플레이스", type: "Brand", info: "좌석 넉넉 + 디저트" },
  { name: "할리스", type: "Brand", info: "카공 분위기, 대화 부담 적음" },
  { name: "폴바셋", type: "Brand", info: "조용-차분 라인" },
  { name: "메가커피(대형)", type: "Brand", info: "가성비 + 접근성" },

  { name: "힙한 개인카페", type: "Private", info: "감성/무드, 대화가 잘 풀림" },
  { name: "창고형 카페", type: "Private", info: "테이블 넓음, 눈치 적음" },
  { name: "북카페", type: "Private", info: "조용+정돈, 진지 토크 좋음" },

  { name: "미팅룸 카페", type: "Room", info: "스터디룸/대형테이블 가능" },
  { name: "스터디 카페", type: "Room", info: "집중/프로젝트 토크 최적" },
];

function weightedCafePick(): { name: string; type: CafeType; info: string } {
  // Brand 0.55 / Private 0.35 / Room 0.10
  const r = Math.random();
  const bucket: CafeType = r < 0.55 ? "Brand" : r < 0.9 ? "Private" : "Room";
  const list = CAFE_DB.filter((x) => x.type === bucket);
  return list[Math.floor(Math.random() * list.length)];
}
function cafeBadgeText(type: CafeType) {
  if (type === "Brand") return "HOT";
  if (type === "Room") return "Room";
  return "Hot";
}
function cafeBadgeTone(type: CafeType) {
  if (type === "Brand") return "#FF9F1A";
  if (type === "Room") return "#2EE778";
  return "#FF5CAB";
}

/* =========================
   Topic Pool
========================= */
const TOPIC_POOL: Record<CatKey, string[]> = {
  Vibe: [
    "대화가 잘 통하는 사람 특징",
    "요즘 설레는 것 한 가지",
    "호감 생기는 말투/매너",
    "편한 사람의 기준",
    "취향이 맞는 사람의 포인트",
  ],
  Friends: [
    "최근 제일 웃겼던 일",
    "TMI 교환 10분",
    "요즘 빠진 밈/콘텐츠",
    "주말에 뭐 하고 놀아?",
    "흑역사 하나 풀기",
  ],
  Try: ["새해/새달 목표", "요즘 배우고 싶은 것", "버킷리스트 하나 공유", "새로운 루틴 추천", "최근 관심사 한 줄 발표"],
  Focus: ["커리어 고민 10분 압축", "이직/연봉/성장 고민", "생산성 루틴/도구", "요즘 집중하는 프로젝트", "멘탈 관리(불안 줄이기)"],
};

function defaultDesc(cat: CatKey) {
  if (cat === "Vibe") return "카페에서 가볍게 얘기해요. 공공장소/예의 필수.";
  if (cat === "Friends") return "재밌게 떠들고 웃는 토크.";
  if (cat === "Try") return "새로운 주제/시도. 짧게 실험해요.";
  return "진지하게 정리하고, 짧게 얻어가요.";
}

/* =========================
   Slot Model
========================= */
type Slot = {
  id: string; // ✅ Firestore doc id도 안전하게 문자열로
  type: CatKey;
  city: string;
  band: string;
  title: string;

  cafeName: string;
  cafeType: CafeType;
  cafeInfo: string;

  start: string;
  end: string;
  totalMins: number;

  recommend: 2 | 3 | 4;
  attendees: string[];
  arrived: string[];
  wait: string[];
  featured: boolean;

  desc: string;
};

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

function makeId() {
  return `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

function generateSlots({ cityCode, band, count }: { cityCode: string; band: string; count: number }): Slot[] {
  const list: Slot[] = [];
  const anchor = BAND_ANCHOR[band] || "19:30";
  const cats: CatKey[] = ["Vibe", "Friends", "Try", "Focus"];

  for (let i = 0; i < count; i++) {
    const type = cats[Math.floor(Math.random() * cats.length)];
    const cafe = weightedCafePick();

    const dur = DUR_OPTS[Math.floor(Math.random() * DUR_OPTS.length)];
    const start = addMin(anchor, 10 * Math.floor(Math.random() * 18));
    const end = addMin(start, dur);

    const topic = TOPIC_POOL[type][Math.floor(Math.random() * TOPIC_POOL[type].length)];
    const recommend = ([2, 3, 4] as const)[Math.floor(Math.random() * 3)];
    const featured = Math.random() < 0.25;

    list.push({
      id: makeId(),
      type,
      city: cityCode,
      band: guessBandFromStart(start),
      title: topic,

      cafeName: cafe.name,
      cafeType: cafe.type,
      cafeInfo: cafe.info,

      start,
      end,
      totalMins: spanMins(start, end),

      recommend,
      attendees: [],
      arrived: [],
      wait: [],
      featured,

      desc: defaultDesc(type),
    });
  }

  return list;
}

/* =========================
   Root
========================= */
function Root() {
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const scrollRef = useRef<ScrollView | null>(null);

  // ✅ 더블탭/더블클릭 방지
  const lastTapRef = useRef(0);
  const guardTap = (fn: () => void) => {
    const now = Date.now();
    if (now - lastTapRef.current < 250) return;
    lastTapRef.current = now;
    fn();
  };

  const [activeCat, setActiveCat] = useState<CatKey | "">("");
  const [dur, setDur] = useState(30);
  const [band, setBand] = useState(T.timeBands[4]); // 저녁
  const [sortBy, setSortBy] = useState(T.sortOpt[0]);
  const [selectedCities, setSelectedCities] = useState<string[]>(HOT5);
  const [showCitySheet, setShowCitySheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [myOnly, setMyOnly] = useState(false);
  const [search, setSearch] = useState("");

  // ✅ 모드: Firestore 권한이 막히면 LOCAL로 자동 전환
  const [mode, setMode] = useState<"firestore" | "local">("firestore");
  const [modeMsg, setModeMsg] = useState<string>("");

  const [slots, setSlots] = useState<Slot[]>([]);

  /** ✅ Firestore helpers */
  const slotRef = (id: string) => doc(db, "slots", id);

  const ensureSlotDoc = async (slot: Slot) => {
    const ref = slotRef(slot.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { ...slot, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    }
    return ref;
  };

  /** ✅ LOCAL seed (권한 막혀도 앱은 살아야 함) */
  const seedLocal = () => {
    const baseCities = HOT5;
    const all: Slot[] = [];
    for (const b of T.timeBands) {
      const perCity = 10; // 밴드당 도시별 10개
      for (const c of baseCities) {
        all.push(...generateSlots({ cityCode: c, band: b, count: perCity }));
      }
    }
    // 총 6 * 5 * 10 = 300개 → 너무 많으면 줄여도 됨
    setSlots(all);
  };

  /** ✅ Firestore seed (가능하면) */
  const seededOnce = useRef(false);
  const seedFirestoreIfEmpty = async () => {
    if (seededOnce.current) return;
    seededOnce.current = true;

    try {
      const batch = writeBatch(db);

      const baseCities = HOT5;
      const all: Slot[] = [];
      for (const b of T.timeBands) {
        const perCity = 8; // 밴드별 city당 8개 = 6*5*8=240개
        for (const c of baseCities) {
          all.push(...generateSlots({ cityCode: c, band: b, count: perCity }));
        }
      }
      const final = all.slice(0, 240);
      for (const s of final) {
        batch.set(slotRef(s.id), { ...s, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      }

      await batch.commit();
      showAlert("초기 슬롯 생성 ✅", "Firestore가 비어있어서 자동으로 슬롯을 채웠어.");
    } catch (e: any) {
      // ✅ seed 쓰기 권한이 없으면 LOCAL로 전환
      const msg = e?.message ?? String(e);
      setMode("local");
      setModeMsg("Firestore 권한이 막혀서 LOCAL 모드로 동작 중이야. (룰 수정하면 자동으로 Firestore 사용)");
      seedLocal();
      showAlert("Firestore 쓰기 권한 없음", msg);
    }
  };

  /** ✅ Firestore 실시간 구독 (실패하면 LOCAL로) */
  useEffect(() => {
    let unsub: null | (() => void) = null;

    try {
      unsub = onSnapshot(
        collection(db, "slots"),
        async (snap) => {
          // ✅ 읽기 성공
          if (mode !== "firestore") {
            setMode("firestore");
            setModeMsg("");
          }

          if (snap.empty) {
            await seedFirestoreIfEmpty();
            return;
          }

          const arr: Slot[] = snap.docs
            .map((d) => {
              const data: any = d.data();
              const id = String(data.id ?? d.id);

              if (!data.type || !data.city || !data.start || !data.end) return null;

              const s: Slot = {
                id,
                type: data.type,
                city: data.city,
                band: data.band ?? guessBandFromStart(data.start),
                title: data.title ?? "",

                cafeName: data.cafeName ?? "",
                cafeType: (data.cafeType ?? "Brand") as CafeType,
                cafeInfo: data.cafeInfo ?? "",

                start: data.start,
                end: data.end,
                totalMins: Number(data.totalMins ?? spanMins(data.start, data.end)),

                recommend: (data.recommend ?? 4) as 2 | 3 | 4,
                attendees: Array.isArray(data.attendees) ? data.attendees : [],
                arrived: Array.isArray(data.arrived) ? data.arrived : [],
                wait: Array.isArray(data.wait) ? data.wait : [],
                featured: !!data.featured,

                desc: data.desc ?? "",
              };
              return s;
            })
            .filter(Boolean) as Slot[];

          setSlots(arr);
        },
        (err) => {
          // ✅ 권한/네트워크로 실패하면 LOCAL로 전환
          const msg = err?.message ?? String(err);
          setMode("local");
          setModeMsg("Firestore 권한/연결 문제로 LOCAL 모드로 동작 중이야. (룰/키 수정하면 자동 복귀)");
          seedLocal();
          showAlert("Firestore 오류", msg);
        }
      );
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setMode("local");
      setModeMsg("Firestore 초기화 문제로 LOCAL 모드로 동작 중이야.");
      seedLocal();
      showAlert("Firestore 초기화 오류", msg);
    }

    return () => {
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetHome = () => {
    setActiveCat("");
    setDur(30);
    setBand(T.timeBands[4]);
    setSortBy(T.sortOpt[0]);
    setSearch("");
    setMyOnly(false);
    setSelectedCities(HOT5);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const toggleCity = (code: string) => {
    setSelectedCities((prev) => {
      const has = prev.includes(code);
      return has ? prev.filter((x) => x !== code) : [...prev, code];
    });
  };

  const list = useMemo(() => {
    let arr = slots.slice();

    if (activeCat) arr = arr.filter((s) => s.type === activeCat);

    const cities = selectedCities.length ? selectedCities : HOT5;
    arr = arr.filter((s) => includes(cities, s.city));

    arr = arr.filter((s) => s.band === band);

    // duration 필터: totalMins >= dur
    arr = arr.filter((s) => (s.totalMins || 10) >= dur);

    if (myOnly) arr = arr.filter((s) => includes(s.attendees, ME));

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((s) => {
        const txt = `${s.title} ${s.cafeName} ${s.cafeType} ${s.city} ${cityName(s.city)} ${s.band}`.toLowerCase();
        return txt.includes(q);
      });
    }

    // 정렬
    if (sortBy === T.sortOpt[0]) {
      arr.sort((a, b) => {
        const as = getState(nowMs, a.start, a.totalMins);
        const bs = getState(nowMs, b.start, b.totalMins);
        const rank = (st: ReturnType<typeof getState>["state"]) => (st === "upcoming" ? 0 : st === "live" ? 1 : 2);
        const r = rank(as.state) - rank(bs.state);
        if (r !== 0) return r;
        return (as.secsToStart || 0) - (bs.secsToStart || 0);
      });
    } else if (sortBy === T.sortOpt[1]) {
      arr.sort((a, b) => (a.id < b.id ? 1 : -1));
    } else {
      // 추천순: featured 먼저 + 대기/참여 수 기준
      arr.sort((a, b) => {
        const fa = Number(a.featured);
        const fb = Number(b.featured);
        if (fb !== fa) return fb - fa;
        const sa = (a.attendees?.length || 0) + (a.wait?.length || 0);
        const sb = (b.attendees?.length || 0) + (b.wait?.length || 0);
        return sb - sa;
      });
    }

    return arr;
  }, [slots, activeCat, dur, band, sortBy, selectedCities, search, myOnly, nowMs]);

  // ✅ 상세 화면: id 말고 “슬롯 객체”로 바로 넘겨서 로딩 방지
  const [screen, setScreen] = useState<"home" | "detail">("home");
  const [selected, setSelected] = useState<Slot | null>(null);

  const openDetails = (slot: Slot) => {
    setSelected(slot);
    setScreen("detail");
  };

  /** ✅ LOCAL/Firestore 공통 업데이트 헬퍼 */
  const updateLocalSlot = (id: string, patch: Partial<Slot>) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  };

  /** ✅ 참여하기(체크인) */
  const join = async (slot: Slot | null) => {
    if (!slot) return;

    const st = getState(nowMs, slot.start, slot.totalMins);
    if (st.state === "ended") {
      showAlert("종료됨", "이미 종료된 슬롯이야.");
      return;
    }

    // LOCAL
    if (mode === "local") {
      const next = uniq([...(slot.attendees || []), ME]);
      updateLocalSlot(slot.id, { attendees: next });
      showAlert("체크인 완료 ✅", "내 모임에 추가됐어.");
      return;
    }

    // Firestore
    try {
      const ref = await ensureSlotDoc(slot);
      await updateDoc(ref, {
        attendees: arrayUnion(ME),
        updatedAt: serverTimestamp(),
      });
      showAlert("체크인 완료 ✅", "내 모임에 추가됐어.");
    } catch (e: any) {
      showAlert("체크인 실패", e?.message ?? String(e));
    }
  };

  const leave = async (slot: Slot | null) => {
    if (!slot) return;

    if (mode === "local") {
      updateLocalSlot(slot.id, {
        attendees: (slot.attendees || []).filter((x) => x !== ME),
        arrived: (slot.arrived || []).filter((x) => x !== ME),
        wait: (slot.wait || []).filter((x) => x !== ME),
      });
      showAlert("나가기", "완료");
      return;
    }

    try {
      const ref = await ensureSlotDoc(slot);
      await updateDoc(ref, {
        attendees: arrayRemove(ME),
        arrived: arrayRemove(ME),
        wait: arrayRemove(ME),
        updatedAt: serverTimestamp(),
      });
      showAlert("나가기", "완료");
    } catch (e: any) {
      showAlert("나가기 실패", e?.message ?? String(e));
    }
  };

  const toggleArrive = async (slot: Slot | null) => {
    if (!slot) return;

    if (!includes(slot.attendees, ME)) {
      showAlert("먼저 참여하기", "참여하기(체크인) 먼저 해줘.");
      return;
    }

    const on = includes(slot.arrived, ME);

    if (mode === "local") {
      const next = on ? (slot.arrived || []).filter((x) => x !== ME) : uniq([...(slot.arrived || []), ME]);
      updateLocalSlot(slot.id, { arrived: next });
      showAlert("도착 체크인", on ? "해제했어 ✅" : "표시했어 ✅");
      return;
    }

    try {
      const ref = await ensureSlotDoc(slot);
      await updateDoc(ref, {
        arrived: on ? arrayRemove(ME) : arrayUnion(ME),
        updatedAt: serverTimestamp(),
      });
      showAlert("도착 체크인", on ? "해제했어 ✅" : "표시했어 ✅");
    } catch (e: any) {
      showAlert("도착 체크인 실패", e?.message ?? String(e));
    }
  };

  const seatless = async (slot: Slot | null) => {
    if (!slot) return;

    const alt = weightedCafePick();

    if (mode === "local") {
      updateLocalSlot(slot.id, { cafeName: alt.name, cafeType: alt.type, cafeInfo: alt.info });
      showAlert("자리 없음 처리", `대체 카페로 변경했어:\n${cityName(slot.city)} · ${alt.name}`);
      return;
    }

    try {
      const ref = await ensureSlotDoc(slot);
      await updateDoc(ref, {
        cafeName: alt.name,
        cafeType: alt.type,
        cafeInfo: alt.info,
        updatedAt: serverTimestamp(),
      });
      showAlert("자리 없음 처리", `대체 카페로 변경했어:\n${cityName(slot.city)} · ${alt.name}`);
    } catch (e: any) {
      showAlert("자리없음 실패", e?.message ?? String(e));
    }
  };

  const applyPriority = async (slot: Slot | null) => {
    if (!slot) return;

    if (!includes(slot.attendees, ME)) {
      showAlert("먼저 참여하기", "참여하기(체크인) 먼저 해줘.");
      return;
    }

    const on = includes(slot.wait, ME);

    if (mode === "local") {
      const next = on ? (slot.wait || []).filter((x) => x !== ME) : uniq([...(slot.wait || []), ME]);
      updateLocalSlot(slot.id, { wait: next });
      showAlert("우선입장", on ? "신청 해제했어." : "신청 반영했어.");
      return;
    }

    try {
      const ref = await ensureSlotDoc(slot);
      await updateDoc(ref, {
        wait: on ? arrayRemove(ME) : arrayUnion(ME),
        updatedAt: serverTimestamp(),
      });
      showAlert("우선입장", on ? "신청 해제했어." : "신청 반영했어.");
    } catch (e: any) {
      showAlert("우선입장 실패", e?.message ?? String(e));
    }
  };

  const shareSlot = async (slot: Slot | null) => {
    if (!slot) return;
    try {
      await Share.share({
        message:
          `TENtion • ${catLabel(slot.type)} ${catIcon(slot.type)}\n` +
          `${slot.title}\n` +
          `📍 ${cityName(slot.city)} · ${slot.cafeName}\n` +
          `🕒 ${slot.start} ~ ${slot.end} (${slot.totalMins}분)\n` +
          `👥 권장 ${slot.recommend}명\n` +
          `${T.safetyNoteShort}`,
      });
    } catch {}
  };

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<{
    cat: CatKey | "";
    city: string;
    topic: string;
    dur: number;
    start: string;
    recommend: 2 | 3 | 4;
    desc: string;
    _cityPick: boolean;
  }>({
    cat: "",
    city: "GN",
    topic: "",
    dur: 30,
    start: "19:30",
    recommend: 4,
    desc: "",
    _cityPick: false,
  });

  const openCreate = () => {
    const firstSel = selectedCities[0] || "GN";
    setForm({
      cat: (activeCat || "") as any,
      city: firstSel,
      topic: "",
      dur: dur,
      start: BAND_ANCHOR[band] || "19:30",
      recommend: 4,
      desc: "",
      _cityPick: false,
    });
    setCreateOpen(true);
  };

  /** ✅ 만들기 */
  const createSlot = async () => {
    const cat = ((form.cat || "Try") as CatKey);
    const city = form.city || "GN";
    const mins = clamp(form.dur, 10, 120);

    const start = parseHM(form.start) != null ? form.start : BAND_ANCHOR[band] || "19:30";
    const end = addMin(start, mins);

    const cafe = weightedCafePick();
    const topic = (form.topic || TOPIC_POOL[cat][Math.floor(Math.random() * TOPIC_POOL[cat].length)]).trim();

    const s: Slot = {
      id: makeId(),
      type: cat,
      city,
      band: guessBandFromStart(start),
      title: topic,

      cafeName: cafe.name,
      cafeType: cafe.type,
      cafeInfo: cafe.info,

      start,
      end,
      totalMins: mins,

      recommend: form.recommend,
      attendees: [],
      arrived: [],
      wait: [],
      featured: true,

      desc: (form.desc || defaultDesc(cat)).trim(),
    };

    // LOCAL
    if (mode === "local") {
      setSlots((prev) => [s, ...prev]);
      setCreateOpen(false);
      setActiveCat(cat);
      setBand(s.band);
      setSelectedCities((prev) => uniq(prev.includes(city) ? prev : [...prev, city]));
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
      showAlert("만들기 완료 ✅", "피드 최상단에 추가했어.");
      return;
    }

    // Firestore
    try {
      await setDoc(slotRef(s.id), { ...s, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });

      setCreateOpen(false);
      setActiveCat(cat);
      setBand(s.band);
      setSelectedCities((prev) => uniq(prev.includes(city) ? prev : [...prev, city]));
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);

      showAlert("만들기 완료 ✅", "피드 최상단에 추가했어.");
    } catch (e: any) {
      showAlert("만들기 실패", e?.message ?? String(e));
    }
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={(e: any) => {
            e?.stopPropagation?.();
            guardTap(resetHome);
          }}
          style={{ flexDirection: "row", alignItems: "flex-end" }}
          hitSlop={10}
        >
          <Text style={styles.logo}>{T.app}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={[styles.secondarySm, myOnly && styles.secondarySmOn]}
            onPress={(e: any) => {
              e?.stopPropagation?.();
              guardTap(() => setMyOnly((v) => !v));
            }}
          >
            <Text style={[styles.secondarySmT, myOnly && styles.secondarySmTOn]}>{T.my}</Text>
          </TouchableOpacity>

          <View style={{ width: 10 }} />

          <TouchableOpacity
            style={styles.primarySm}
            onPress={(e: any) => {
              e?.stopPropagation?.();
              guardTap(openCreate);
            }}
          >
            <Text style={styles.primarySmT}>{T.create}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MODE BANNER */}
      {!!modeMsg && (
        <View style={styles.banner}>
          <Text style={styles.bannerT}>{modeMsg}</Text>
        </View>
      )}

      {/* HOME */}
      {screen === "home" && (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
        >
          {/* CATEGORIES */}
          <View style={styles.catRow}>
            {CATS.map((c) => {
              const on = activeCat === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={(e: any) => {
                    e?.stopPropagation?.();
                    guardTap(() => setActiveCat((p) => (p === c.key ? "" : c.key)));
                  }}
                  style={[styles.catChip, { borderColor: c.color }, on ? { backgroundColor: c.color + "22" } : null]}
                >
                  <Text style={[styles.catText, { color: c.color }]} numberOfLines={1}>
                    {c.icon} {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Row: duration + sort */}
          <View style={styles.row2}>
            <Stepper
              label={T.duration}
              value={dur}
              onMinus={() => setDur((v) => clamp(v - 10, 10, 120))}
              onPlus={() => setDur((v) => clamp(v + 10, 10, 120))}
            />

            <TouchableOpacity
              style={styles.sortBtn}
              onPress={(e: any) => {
                e?.stopPropagation?.();
                guardTap(() => setShowSortSheet(true));
              }}
            >
              <Text style={styles.sortBtnT} numberOfLines={1}>
                {T.sort}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 시간대 */}
          <View style={styles.bandRow}>
            {T.timeBands.map((b, idx) => (
              <TouchableOpacity
                key={b}
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  guardTap(() => setBand(b));
                }}
                style={[styles.bandChip, band === b ? styles.bandChipOn : null, idx !== 0 ? { marginLeft: 6 } : null]}
              >
                <Text style={[styles.bandChipT, band === b ? styles.bandChipTOn : null]} numberOfLines={1}>
                  {b}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* HOT5 + 지역선택 */}
          <View style={styles.hotRow}>
            {HOT5.map((code, idx) => {
              const on = selectedCities.includes(code);
              return (
                <TouchableOpacity
                  key={code}
                  onPress={(e: any) => {
                    e?.stopPropagation?.();
                    guardTap(() => toggleCity(code));
                  }}
                  style={[
                    styles.cityChip,
                    on ? styles.cityChipActive : null,
                    idx !== 0 ? { marginLeft: 6 } : null,
                  ]}
                >
                  <Text style={[styles.cityChipT, on ? styles.cityChipTActive : null]} numberOfLines={1}>
                    {cityName(code)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.moreChip, { marginLeft: 6 }]}
              onPress={(e: any) => {
                e?.stopPropagation?.();
                guardTap(() => setShowCitySheet(true));
              }}
            >
              <Text style={styles.moreChipT} numberOfLines={1}>
                지역선택…
              </Text>
            </TouchableOpacity>
          </View>

          {/* SEARCH */}
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={T.searchPH}
            placeholderTextColor="#7a8596"
            style={styles.search}
          />

          {/* EMPTY */}
          {list.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyT}>{T.noSlotsT}</Text>
              <Text style={styles.emptyS}>{myOnly ? "아직 내 모임이 없어. 슬롯에서 참여하기 누르면 여기에 생겨." : T.noSlotsS}</Text>
            </View>
          )}

          {/* FEED */}
          {list.map((s) => (
            <Card
              key={s.id}
              slot={s}
              nowMs={nowMs}
              onDetails={() => guardTap(() => openDetails(s))}
              onPrimary={() => guardTap(() => join(s))}
            />
          ))}

          <View style={styles.noteBox}>
            <Text style={styles.note}>{T.safetyNoteShort}</Text>
          </View>
        </ScrollView>
      )}

      {/* DETAILS */}
      {screen === "detail" && (
        <Details
          slot={selected}
          nowMs={nowMs}
          onBack={() => {
            setScreen("home");
          }}
          onShare={() => shareSlot(selected)}
          onJoin={() => join(selected)}
          onLeave={() => leave(selected)}
          onArrive={() => toggleArrive(selected)}
          onSeatless={() => seatless(selected)}
          onPriority={() => applyPriority(selected)}
        />
      )}

      {/* SORT SHEET */}
      {showSortSheet && (
        <ActionSheet
          title={T.sort}
          value={sortBy}
          options={T.sortOpt}
          onPick={(v) => {
            setSortBy(v);
            setShowSortSheet(false);
          }}
          onCancel={() => setShowSortSheet(false)}
        />
      )}

      {/* CITY SHEET */}
      {showCitySheet && (
        <MultiCitySheet
          currentList={selectedCities}
          onApply={(codes) => {
            setSelectedCities(codes);
            setShowCitySheet(false);
          }}
          onClose={() => setShowCitySheet(false)}
        />
      )}

      {/* CREATE */}
      {createOpen && (
        <CreateModal
          form={form}
          setForm={setForm}
          onClose={() => setCreateOpen(false)}
          onCreate={createSlot}
          currentBand={band}
        />
      )}
    </SafeAreaView>
  );
}

/* =========================
   UI Components
========================= */
function Tap({
  onPress,
  style,
  children,
}: {
  onPress: (e?: any) => void;
  style?: any;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={(e) => onPress(e)}
      style={({ pressed }) => [
        style,
        Platform.OS === "web" ? { cursor: "pointer" } : null,
        pressed ? { opacity: 0.88 } : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepBtn} onPress={onMinus} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.stepBtnT}>−</Text>
      </TouchableOpacity>

      <View style={styles.stepMid}>
        <Text style={styles.stepVal} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.stepLbl} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <TouchableOpacity style={styles.stepBtn} onPress={onPlus} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.stepBtnT}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

function MiniBadge({ text, tone }: { text: string; tone: string }) {
  return (
    <View style={[styles.miniBadge, { backgroundColor: tone + "22", borderColor: tone }]}>
      <Text style={[styles.miniBadgeT, { color: tone }]}>{text}</Text>
    </View>
  );
}

function Card({
  slot,
  onDetails,
  onPrimary,
  nowMs,
}: {
  slot: Slot;
  onDetails: () => void;
  onPrimary: () => void;
  nowMs: number;
}) {
  const st = getState(nowMs, slot.start, slot.totalMins);
  const labelTone = st.state === "live" ? "#2EE778" : st.state === "upcoming" ? "#3EC6FF" : "#666";
  const labelText = st.state === "upcoming" ? `⏳ ${fmtHMS(st.secsToStart)}` : st.state === "live" ? "진행중" : "종료";

  const hotTone = cafeBadgeTone(slot.cafeType);
  const featuredTone = "#3EC6FF";
  const priorityTone = "#2EE778";

  return (
    <View style={[styles.card, { borderColor: catColor(slot.type) }]}>
      <View style={styles.cardHead}>
        <Text style={[styles.cardType, { color: catColor(slot.type) }]} numberOfLines={1}>
          {catIcon(slot.type)} {catLabel(slot.type)} • {cityName(slot.city)} • {slot.band}
        </Text>
        <MiniBadge text={labelText} tone={labelTone} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
        <MiniBadge text="Hot" tone="#FF5CAB" />
        <View style={{ width: 8 }} />
        <MiniBadge text={cafeBadgeText(slot.cafeType)} tone={hotTone} />
        {slot.featured ? (
          <>
            <View style={{ width: 8 }} />
            <MiniBadge text="Featured" tone={featuredTone} />
          </>
        ) : null}
        <View style={{ width: 8 }} />
        <MiniBadge text={`우선입장 ${slot.wait.length}`} tone={priorityTone} />
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>
        {slot.title}
      </Text>

      <Text style={styles.cardLine}>
        📍 {cityName(slot.city)} · {slot.cafeName} ({slot.cafeInfo})
      </Text>

      <Text style={styles.cardLine}>
        🕒 {slot.start} ~ {slot.end} · {slot.totalMins}분
      </Text>

      <Text style={styles.cardLine}>
        👥 {slot.attendees.length} / 권장 {slot.recommend}명 · {stars(slot.featured ? 5 : 4)} · 대기 {slot.wait.length}
      </Text>

      <Text style={styles.cardDesc} numberOfLines={2}>
        {slot.desc}
      </Text>

      <View style={styles.cardFoot}>
        <Tap style={styles.outBtn} onPress={() => onDetails()}>
          <Text style={styles.outBtnT}>{T.details}</Text>
        </Tap>

        <Tap style={styles.inBtn} onPress={() => onPrimary()}>
          <Text style={styles.inBtnT}>{T.checkin}</Text>
        </Tap>
      </View>
    </View>
  );
}

function Details({
  slot,
  onBack,
  onShare,
  onJoin,
  onLeave,
  onArrive,
  onSeatless,
  onPriority,
  nowMs,
}: {
  slot: Slot | null;
  onBack: () => void;
  onShare: () => void;
  onJoin: () => void;
  onLeave: () => void;
  onArrive: () => void;
  onSeatless: () => void;
  onPriority: () => void;
  nowMs: number;
}) {
  if (!slot) {
    return (
      <View style={styles.detailWrap}>
        <SafeAreaView />
        <View style={{ padding: 18 }}>
          <TouchableOpacity onPress={onBack} hitSlop={12}>
            <Text style={styles.back}>{T.back}</Text>
          </TouchableOpacity>
          <View style={styles.loadingBox}>
            <Text style={styles.loadingT}>슬롯을 불러오는 중…</Text>
            <Text style={styles.loadingS}>잠깐만! 곧 들어갈 거야</Text>
          </View>
        </View>
      </View>
    );
  }

  const joined = includes(slot.attendees, ME);
  const arrived = includes(slot.arrived, ME);

  const st = getState(nowMs, slot.start, slot.totalMins);
  const labelTone = st.state === "live" ? "#2EE778" : st.state === "upcoming" ? "#3EC6FF" : "#666";
  const labelText = st.state === "upcoming" ? `⏳ ${fmtHMS(st.secsToStart)}` : st.state === "live" ? "진행중" : "종료";

  return (
    <View style={styles.detailWrap}>
      <SafeAreaView />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>{T.back}</Text>
        </TouchableOpacity>

        <View style={[styles.detailsBox, { borderColor: catColor(slot.type) }]}>
          <View style={styles.badgeRow}>
            <MiniBadge text={`${catIcon(slot.type)} ${catLabel(slot.type)}`} tone={catColor(slot.type)} />
            <MiniBadge text={cafeBadgeText(slot.cafeType)} tone={cafeBadgeTone(slot.cafeType)} />
            {slot.featured ? <MiniBadge text="Featured" tone="#3EC6FF" /> : null}
            <MiniBadge text={labelText} tone={labelTone} />
          </View>

          <Text style={[styles.detailsTitle, { color: catColor(slot.type) }]} numberOfLines={3}>
            {slot.title}
          </Text>

          <View style={styles.infoBlock}>
            <Text style={styles.infoLine}>📍 {cityName(slot.city)} · {slot.cafeName} ({slot.cafeInfo})</Text>
            <Text style={styles.infoLine}>🕒 {slot.start} ~ {slot.end} · {slot.totalMins}분</Text>
            <Text style={styles.infoLine}>👥 참여자 {slot.attendees.length}명 / 권장 {slot.recommend}명 · 대기 {slot.wait.length}명</Text>
            <Text style={styles.infoLine}>✅ 도착 체크인: {slot.arrived.length}명</Text>
          </View>

          <View style={styles.policyBox}>
            <Text style={styles.secTitle}>✅ {T.boundaryTitle}</Text>
            <Text style={styles.policyLine}>• 카페(공공장소) only · DM 금지 · 예의 필수 · 각자 결제</Text>
            <Text style={styles.policyLine}>• 지정 시간/장소 밖의 만남·이동·개인 연락교환 등은 플랫폼이 책임지지 않아</Text>
          </View>

          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <Tap style={styles.secondaryBtn} onPress={onShare}>
              <Text style={styles.secondaryText}>{T.share}</Text>
            </Tap>

            <View style={{ width: 10 }} />

            {!joined ? (
              <Tap style={styles.primaryBtn} onPress={onJoin}>
                <Text style={styles.primaryText}>{T.checkin}</Text>
              </Tap>
            ) : (
              <Tap
                style={[styles.secondaryBtn, { borderColor: "#FF5A5A", backgroundColor: "#FF5A5A22" }]}
                onPress={onLeave}
              >
                <Text style={[styles.secondaryText, { color: "#FF5A5A" }]}>나가기</Text>
              </Tap>
            )}
          </View>

          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <Tap style={styles.secondaryBtn} onPress={onSeatless}>
              <Text style={styles.secondaryText}>{T.seatless}</Text>
            </Tap>

            <View style={{ width: 10 }} />

            <Tap style={[styles.primaryBtn, arrived ? { backgroundColor: "#2EE778" } : null]} onPress={onArrive}>
              <Text style={[styles.primaryText, arrived ? { color: "#0D0F13" } : null]}>{T.arrive}</Text>
            </Tap>
          </View>

          <View style={{ marginTop: 10 }}>
            <Tap style={[styles.primaryBtn, { backgroundColor: "#2EE778" }]} onPress={onPriority}>
              <Text style={[styles.primaryText, { color: "#0D0F13" }]}>{T.priority}</Text>
            </Tap>
            <Text style={{ color: "#6c7686", marginTop: 8, fontSize: 12, lineHeight: 18 }}>
              혼잡하면 우선입장(대기열)로 분산시키는 실험용 기능이야.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ActionSheet({
  title,
  value,
  options,
  onPick,
  onCancel,
}: {
  title: string;
  value: string;
  options: string[];
  onPick: (v: string) => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.sheetWrap}>
      <Tap style={{ flex: 1 }} onPress={onCancel}>
        <View />
      </Tap>

      <View style={styles.sheetCard}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{title}</Text>

        {options.map((opt) => (
          <Tap key={opt} style={styles.sheetItem} onPress={() => onPick(opt)}>
            <Text style={[styles.sheetItemT, value === opt ? { color: "#3EC6FF" } : null]}>
              {opt}
              {value === opt ? " •" : ""}
            </Text>
          </Tap>
        ))}

        <Tap style={[styles.primaryBtn, { marginTop: 6 }]} onPress={onCancel}>
          <Text style={styles.primaryText}>OK</Text>
        </Tap>
      </View>
    </View>
  );
}

function MultiCitySheet({
  currentList,
  onApply,
  onClose,
}: {
  currentList: string[];
  onApply: (codes: string[]) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<string[]>(uniq(currentList || []));

  const toggle = (code: string) =>
    setLocal((prev) => {
      const has = prev.includes(code);
      return has ? prev.filter((x) => x !== code) : [...prev, code];
    });

  const apply = () => onApply(uniq(local));
  const reset = () => setLocal([]);

  const groups: Record<string, Array<(typeof CITY_LIST)[number]>> = {};
  CITY_LIST.forEach((c) => {
    const g = c.region || "기타";
    if (!groups[g]) groups[g] = [];
    groups[g].push(c);
  });

  return (
    <View style={styles.sheetWrap}>
      <Tap style={{ flex: 1 }} onPress={onClose}>
        <View />
      </Tap>

      <View style={styles.sheetCardTall}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>지역(복수선택)</Text>

        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false} overScrollMode="never">
          {Object.keys(groups).map((gr) => (
            <View key={gr} style={{ marginBottom: 8 }}>
              <Text style={{ color: "#9aa", marginBottom: 6, fontWeight: "800" }}>{gr}</Text>

              {groups[gr].map((c) => {
                const on = local.includes(c.code);
                return (
                  <Tap key={c.code} style={styles.cityRow} onPress={() => toggle(c.code)}>
                    <View style={[styles.chk, on ? styles.chkOn : null]}>
                      <Text style={[styles.chkT, on ? styles.chkTOn : null]}>✓</Text>
                    </View>

                    <Text style={[styles.cityRowT, on ? { color: "#3EC6FF" } : null]} numberOfLines={1}>
                      {c.name}
                    </Text>
                  </Tap>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <View style={{ flexDirection: "row", marginTop: 10, justifyContent: "flex-end" }}>
          <Tap style={styles.secondaryBtn} onPress={reset}>
            <Text style={styles.secondaryText}>초기화</Text>
          </Tap>

          <View style={{ width: 8 }} />

          <Tap style={styles.primaryBtn} onPress={apply}>
            <Text style={styles.primaryText}>적용</Text>
          </Tap>
        </View>
      </View>
    </View>
  );
}

/* Create Modal */
function CreateModal({
  form,
  setForm,
  onClose,
  onCreate,
  currentBand,
}: {
  form: any;
  setForm: any;
  onClose: () => void;
  onCreate: () => void;
  currentBand: string;
}) {
  const setDur = (v: number) => setForm((f: any) => ({ ...f, dur: clamp(v, 10, 120) }));
  const setRec = (v: 2 | 3 | 4) => setForm((f: any) => ({ ...f, recommend: v }));

  return (
    <View style={styles.modalWrap}>
      <SafeAreaView />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.modalHead}>
          <Text style={styles.modalTitle}>슬롯 만들기</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.modalClose}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 14, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.formLabel}>카테고리</Text>
          <View style={styles.dualWrap}>
            {CATS.map((c) => (
              <TouchableOpacity
                key={c.key}
                onPress={() => setForm((f: any) => ({ ...f, cat: f.cat === c.key ? "" : c.key }))}
                style={[
                  styles.formChipHalf,
                  { borderColor: c.color, justifyContent: "center" },
                  form.cat === c.key ? { backgroundColor: c.color + "22" } : null,
                ]}
              >
                <Text style={[styles.formChipT, { color: c.color, textAlign: "center" }]} numberOfLines={1}>
                  {c.icon} {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formLabel}>도시</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setForm((f: any) => ({ ...f, _cityPick: true }))}>
            <Text style={styles.pickerT}>
              도시: <Text style={{ color: "#fff" }}>{cityName(form.city)}</Text>
            </Text>
          </TouchableOpacity>

          {form._cityPick && (
            <View style={styles.sheetWrap}>
              <Tap style={{ flex: 1 }} onPress={() => setForm((f: any) => ({ ...f, _cityPick: false }))}>
                <View />
              </Tap>

              <View style={styles.sheetCardTall}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>도시 선택</Text>
                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false} overScrollMode="never">
                  {CITY_LIST.map((c) => (
                    <Tap
                      key={c.code}
                      style={styles.cityRow}
                      onPress={() => setForm((f: any) => ({ ...f, city: c.code, _cityPick: false }))}
                    >
                      <Text style={[styles.cityRowT, form.city === c.code ? { color: "#3EC6FF" } : null]} numberOfLines={1}>
                        {c.name}
                      </Text>
                    </Tap>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          <Text style={styles.formLabel}>시작 (24H)</Text>
          <TextInput
            style={styles.input}
            placeholder="HH:MM"
            placeholderTextColor="#738"
            value={form.start}
            onChangeText={(t) => setForm((f: any) => ({ ...f, start: t }))}
          />

          <Text style={styles.formLabel}>진행시간</Text>
          <View style={styles.durationGrid}>
            {DUR_OPTS.map((n) => {
              const on = form.dur === n;
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.timeChipGrid, on ? styles.timeChipGridOn : null]}
                  onPress={() => setDur(n)}
                >
                  <Text style={[styles.timeChipGridT, on ? styles.timeChipGridTOn : null]}>{n} 분</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.formLabel}>권장 인원</Text>
          <View style={{ flexDirection: "row" }}>
            {[2, 3, 4].map((n, idx) => {
              const on = form.recommend === n;
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.recBtn, on ? styles.recBtnOn : null, idx !== 0 ? { marginLeft: 10 } : null]}
                  onPress={() => setRec(n as any)}
                >
                  <Text style={[styles.recBtnT, on ? styles.recBtnTOn : null]}>{n}명</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.previewBox}>
            <Text style={{ color: "#cbd3df", fontWeight: "900" }}>
              🕒 {form.start} ~ {addMin(form.start, form.dur)} (예상)
            </Text>
            <Text style={{ color: "#9aa", marginTop: 6 }}>
              👥 권장 {form.recommend}명 · 연장은 현장 합의(플랫폼 책임 범위 밖)
            </Text>
          </View>

          <Text style={styles.formLabel}>제목</Text>
          <TextInput
            style={styles.input}
            placeholder="슬롯 제목"
            placeholderTextColor="#b57"
            value={form.topic}
            onChangeText={(v) => setForm((f: any) => ({ ...f, topic: v }))}
          />

          <Text style={styles.formLabel}>설명</Text>
          <TextInput
            style={[styles.input, { height: 120, textAlignVertical: "top" }]}
            placeholder="짧은 설명"
            placeholderTextColor="#b57"
            multiline
            value={form.desc}
            onChangeText={(v) => setForm((f: any) => ({ ...f, desc: v }))}
          />

          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <Tap style={styles.secondaryBtn} onPress={() => showAlert("안전수칙", T.boundaryBody)}>
              <Text style={styles.secondaryText}>안전수칙</Text>
            </Tap>

            <View style={{ width: 10 }} />

            <Tap style={styles.primaryBtn} onPress={onCreate}>
              <Text style={styles.primaryText}>만들기</Text>
            </Tap>
          </View>

          <Text style={{ color: "#6c7686", marginTop: 10, fontSize: 12, lineHeight: 18 }}>
            * 텐션은 기본적으로 “{currentBand}” 탭에서 슬롯이 보여.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* =========================
   Styles (neon-dark)
========================= */
const CONTROL_H = 44;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0F13" },

  banner: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#151821",
    borderWidth: 1,
    borderColor: "#2A2F38",
  },
  bannerT: { color: "#cbd3df", fontWeight: "800", fontSize: 12, lineHeight: 16 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 6,
    marginBottom: 6,
  },
  logo: { color: "#fff", fontSize: 28, fontWeight: "900" },
  primarySm: { backgroundColor: "#3EC6FF", paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12 },
  primarySmT: { color: "#0D0F13", fontWeight: "900" },
  secondarySm: {
    backgroundColor: "#3EC6FF22",
    borderWidth: 1,
    borderColor: "#3EC6FF",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  secondarySmOn: { backgroundColor: "#3EC6FF" },
  secondarySmT: { color: "#3EC6FF", fontWeight: "800" },
  secondarySmTOn: { color: "#0D0F13", fontWeight: "900" },

  catRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, marginBottom: 8 },
  catChip: {
    width: "23.5%",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  catText: { fontWeight: "900", fontSize: 13 },

  row2: { flexDirection: "row", marginBottom: 8, paddingHorizontal: 12 },
  stepper: {
    flex: 1,
    height: CONTROL_H,
    borderRadius: 12,
    backgroundColor: "#161A22",
    borderWidth: 1,
    borderColor: "#2A2F38",
    flexDirection: "row",
    overflow: "hidden",
    marginRight: 8,
  },
  stepBtn: { width: 48, alignItems: "center", justifyContent: "center" },
  stepBtnT: { color: "#fff", fontSize: 18, fontWeight: "900" },
  stepMid: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#2A2F38",
  },
  stepVal: { color: "#fff", fontWeight: "900", fontSize: 16, lineHeight: 18 },
  stepLbl: { color: "#9aa", fontWeight: "700", fontSize: 11, marginTop: 2 },

  sortBtn: {
    width: 110,
    height: CONTROL_H,
    borderRadius: 12,
    backgroundColor: "#161A22",
    borderWidth: 1,
    borderColor: "#2A2F38",
    alignItems: "center",
    justifyContent: "center",
  },
  sortBtnT: { color: "#fff", fontWeight: "900", fontSize: 13 },

  bandRow: { flexDirection: "row", paddingHorizontal: 12, marginBottom: 8 },
  bandChip: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#151821",
    borderWidth: 1,
    borderColor: "#2A2F38",
    alignItems: "center",
    justifyContent: "center",
  },
  bandChipOn: { backgroundColor: "#3A3F4A" },
  bandChipT: { color: "#9aa", fontWeight: "800", fontSize: 12 },
  bandChipTOn: { color: "#fff" },

  hotRow: { flexDirection: "row", paddingHorizontal: 12, marginBottom: 8 },
  cityChip: {
    flex: 1,
    height: 36,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#151821",
    borderWidth: 1,
    borderColor: "#2A2F38",
    alignItems: "center",
    justifyContent: "center",
  },
  cityChipActive: { backgroundColor: "#3A3F4A" },
  cityChipT: { color: "#9aa", fontWeight: "800", fontSize: 12 },
  cityChipTActive: { color: "#fff" },
  moreChip: {
    flex: 1,
    height: 36,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#151821",
    borderWidth: 1,
    borderColor: "#2A2F38",
    alignItems: "center",
    justifyContent: "center",
  },
  moreChipT: { color: "#ddd", fontWeight: "800", fontSize: 12 },

  search: {
    backgroundColor: "#141821",
    color: "#fff",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#232833",
    marginBottom: 8,
    marginHorizontal: 12,
  },

  empty: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#151821",
    borderWidth: 1,
    borderColor: "#2A2F38",
    marginTop: 4,
    marginHorizontal: 12,
  },
  emptyT: { color: "#fff", fontWeight: "900", marginBottom: 4 },
  emptyS: { color: "#9aa" },

  card: { borderWidth: 2, borderRadius: 12, padding: 12, marginBottom: 10, marginHorizontal: 12 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardType: { fontWeight: "900", fontSize: 12, maxWidth: "70%" },
  cardTitle: { color: "#fff", fontSize: 17, fontWeight: "900", marginBottom: 6 },
  cardLine: { color: "#bbb", fontSize: 12, marginBottom: 4 },
  cardDesc: { color: "#cfe8cf", fontSize: 12, marginTop: 2 },
  cardFoot: { flexDirection: "row", marginTop: 10 },
  outBtn: {
    borderWidth: 1,
    borderColor: "#555",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  outBtnT: { color: "#ddd", fontWeight: "800", fontSize: 12 },
  inBtn: {
    backgroundColor: "#3EC6FF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inBtnT: { color: "#0D0F13", fontWeight: "900", fontSize: 12 },

  detailWrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#0D0F13" },
  back: { color: "#9aa", marginBottom: 12, fontSize: 14 },

  loadingBox: {
    marginTop: 10,
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#151821",
    borderWidth: 1,
    borderColor: "#2A2F38",
  },
  loadingT: { color: "#fff", fontWeight: "900", fontSize: 16, marginBottom: 6 },
  loadingS: { color: "#9aa", fontWeight: "800" },

  detailsBox: { borderWidth: 2, borderRadius: 14, padding: 16 },
  detailsTitle: { fontSize: 22, fontWeight: "900", marginBottom: 8 },
  badgeRow: { flexDirection: "row", marginBottom: 10, flexWrap: "wrap" },
  miniBadge: { borderWidth: 1, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, marginRight: 8, marginBottom: 8 },
  miniBadgeT: { fontSize: 11, fontWeight: "800" },

  infoBlock: {
    backgroundColor: "#11161d",
    borderWidth: 1,
    borderColor: "#253041",
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  infoLine: { color: "#dfe7f3", marginBottom: 6, fontSize: 14 },

  policyBox: {
    backgroundColor: "#101820",
    borderWidth: 1,
    borderColor: "#2A3748",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  policyLine: { color: "#cbd3df", fontSize: 13, marginBottom: 6 },
  secTitle: { color: "#fff", fontWeight: "900", marginBottom: 6, fontSize: 16 },

  sheetWrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#0009", justifyContent: "flex-end" },
  sheetCard: {
    backgroundColor: "#151821",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2A2F38",
  },
  sheetCardTall: {
    backgroundColor: "#151821",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2A2F38",
    maxHeight: 520,
  },
  sheetHandle: { width: 44, height: 4, backgroundColor: "#2A2F38", borderRadius: 2, alignSelf: "center", marginBottom: 10 },
  sheetTitle: { color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 8 },
  sheetItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#262B35" },
  sheetItemT: { color: "#cfd6e4", fontSize: 16, fontWeight: "800" },

  cityRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#262B35" },
  cityRowT: { color: "#cfd6e4", fontSize: 16, fontWeight: "800" },
  chk: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#3EC6FF22",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1D23",
    marginRight: 10,
  },
  chkOn: { borderColor: "#3EC6FF", backgroundColor: "#3EC6FF22" },
  chkT: { color: "#6A7A8E", fontSize: 12, fontWeight: "900" },
  chkTOn: { color: "#3EC6FF", fontWeight: "900" },

  modalWrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#0D0F13" },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingTop: 6, paddingBottom: 6 },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  modalClose: { color: "#9aa", fontSize: 20, fontWeight: "900" },

  formLabel: { color: "#9aa", marginTop: 8, marginBottom: 6, fontWeight: "700" },
  dualWrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 4 },
  formChipHalf: { width: "49%", height: 50, paddingHorizontal: 12, borderWidth: 2, borderRadius: 12, alignItems: "center", marginBottom: 8 },
  formChipT: { fontWeight: "900", fontSize: 14 },

  picker: { height: 44, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#151821", borderWidth: 1, borderColor: "#2A2F38", alignItems: "center", justifyContent: "center" },
  pickerT: { color: "#cfd6e4", fontWeight: "800" },

  input: { backgroundColor: "#151821", color: "#fff", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#2A2F38", marginBottom: 8 },

  durationGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 2 },
  timeChipGrid: { width: "23%", alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: "#1A1D23", borderWidth: 1, borderColor: "#2A2F38", marginBottom: 8 },
  timeChipGridOn: { backgroundColor: "#3A3F4A" },
  timeChipGridT: { color: "#9aa", fontWeight: "800", fontSize: 12 },
  timeChipGridTOn: { color: "#fff" },

  recBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 12, backgroundColor: "#1A1D23", borderWidth: 1, borderColor: "#2A2F38" },
  recBtnOn: { backgroundColor: "#3A3F4A" },
  recBtnT: { color: "#9aa", fontWeight: "900", fontSize: 14 },
  recBtnTOn: { color: "#fff" },

  previewBox: { marginTop: 12, backgroundColor: "#151821", borderWidth: 1, borderColor: "#2A2F38", borderRadius: 12, padding: 12 },

  primaryBtn: { backgroundColor: "#3EC6FF", padding: 12, borderRadius: 10, flex: 1, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#0D0F13", textAlign: "center", fontWeight: "900" },
  secondaryBtn: { backgroundColor: "#3EC6FF22", borderColor: "#3EC6FF", borderWidth: 1, padding: 12, borderRadius: 10, flex: 1, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#3EC6FF", textAlign: "center", fontWeight: "800" },

  noteBox: { marginTop: 10, backgroundColor: "#151821", borderWidth: 1, borderColor: "#2A2F38", borderRadius: 12, padding: 12, marginHorizontal: 12 },
  note: { color: "#cbd3df", textAlign: "center" },
});
