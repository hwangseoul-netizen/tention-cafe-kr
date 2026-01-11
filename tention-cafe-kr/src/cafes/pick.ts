import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/firebase";

export type Cafe = {
  id: string;
  cityCode: string;
  name: string;
  address: string;
  tags: string[];
  seatsHint: "여유" | "보통" | string;
  active: boolean;
};

export type CafePick = {
  main: Cafe;
  alternatives: Cafe[];
};

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function getRandomCafePicks(cityCode: string): Promise<CafePick> {
  const q = query(
    collection(db, "cafes"),
    where("active", "==", true),
    where("cityCode", "==", cityCode)
  );

  const snap = await getDocs(q);

  const cafes: Cafe[] = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }));

  if (cafes.length < 1) {
    throw new Error(`cafes 데이터가 없어. 먼저 씨딩 버튼 눌러줘. (cityCode=${cityCode})`);
  }

  const picked = shuffle(cafes).slice(0, 3);
  const main = picked[0];
  const alternatives = picked.slice(1);

  // city에 1~2개밖에 없을 때 대비
  while (alternatives.length < 2) alternatives.push(main);

  return { main, alternatives };
}
