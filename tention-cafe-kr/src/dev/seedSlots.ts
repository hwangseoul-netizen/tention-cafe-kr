// src/dev/seedSlots.ts
import { collection, doc, getDocs, limit, query, writeBatch } from "firebase/firestore";
import { db, ensureAnonAuth } from "../firebase";
import { generateSlots200 } from "../slots/generate";

export async function seedSlotsOnce(params: { cities: string[]; band: string }) {
  await ensureAnonAuth(); // rules 때문에 로그인 필요할 수 있어서 무조건
  const col = collection(db, "slots");
  const snap = await getDocs(query(col, limit(1)));
  if (!snap.empty) return { seeded: false };

  const batch = writeBatch(db);
  const slots = generateSlots200(params);

  for (const s of slots) {
    const ref = doc(col);
    batch.set(ref, { id: ref.id, ...s });
  }

  await batch.commit();
  return { seeded: true, count: slots.length };
}
