import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

// ✅ 스벅 제외 샘플. (나중에 실제 데이터로 교체)
const CAFES = [
  { cityCode: "GN", name: "카페 오프화이트", address: "서울 강남구 테헤란로 123", tags: ["조용", "미팅", "콘센트"], seatsHint: "여유" },
  { cityCode: "GN", name: "브런치랩 강남", address: "서울 강남구 강남대로 456", tags: ["넓음", "대화", "밝음"], seatsHint: "보통" },
  { cityCode: "HD", name: "합정 북카페 페이지", address: "서울 마포구 양화로 77", tags: ["북카페", "차분", "대화"], seatsHint: "여유" },
  { cityCode: "HD", name: "망원 로스터리 웨이브", address: "서울 마포구 망원로 12", tags: ["힙", "로스터리", "수다"], seatsHint: "보통" },
  { cityCode: "JS", name: "잠실 라운지카페", address: "서울 송파구 올림픽로 35", tags: ["넓음", "미팅", "쾌적"], seatsHint: "여유" },
  { cityCode: "JS", name: "석촌 호수뷰 카페", address: "서울 송파구 석촌호수로 88", tags: ["뷰", "대화"], seatsHint: "보통" },
  { cityCode: "GS", name: "성수 창고형 카페", address: "서울 성동구 연무장길 19", tags: ["힙", "대형", "수다"], seatsHint: "여유" },
  { cityCode: "GS", name: "서울숲 커피바", address: "서울 성동구 서울숲길 9", tags: ["조용", "대화"], seatsHint: "보통" },
  { cityCode: "YD", name: "여의도 라운지카페", address: "서울 영등포구 국제금융로 10", tags: ["직장인", "점심"], seatsHint: "보통" },
  { cityCode: "YD", name: "여의도 북라운지", address: "서울 영등포구 여의대로 22", tags: ["차분", "대화"], seatsHint: "여유" },
  { cityCode: "SUW", name: "광교 테라스카페", address: "경기 수원시 영통구 광교호수로 55", tags: ["넓음", "쾌적"], seatsHint: "여유" },
  { cityCode: "SUW", name: "수원 로스터스", address: "경기 수원시 팔달구 인계로 101", tags: ["로스터리", "힙"], seatsHint: "보통" },
  { cityCode: "GGS", name: "판교 미팅룸 카페", address: "경기 성남시 분당구 판교역로 235", tags: ["미팅", "룸"], seatsHint: "여유" },
  { cityCode: "GGS", name: "정자역 라운지", address: "경기 성남시 분당구 정자일로 11", tags: ["직장인", "대화"], seatsHint: "보통" },
  { cityCode: "GGN", name: "일산 호수공원 앞 카페", address: "경기 고양시 일산동구 호수로 33", tags: ["넓음", "대화"], seatsHint: "여유" },
  { cityCode: "GGN", name: "의정부 스터디카페", address: "경기 의정부시 시민로 9", tags: ["스터디", "조용"], seatsHint: "보통" },
  { cityCode: "ICN", name: "송도 센트럴 카페", address: "인천 연수구 센트럴로 28", tags: ["넓음", "쾌적"], seatsHint: "여유" },
  { cityCode: "ICN", name: "송도 북라운지", address: "인천 연수구 인천타워대로 99", tags: ["북", "차분"], seatsHint: "보통" },
  { cityCode: "GN", name: "강남 스터디룸 카페", address: "서울 강남구 봉은사로 70", tags: ["룸", "미팅"], seatsHint: "여유" },
  { cityCode: "HD", name: "합정 대형테이블 카페", address: "서울 마포구 독막로 5", tags: ["대형테이블", "수다"], seatsHint: "보통" },
];

export async function seedCafesOnce() {
  const col = collection(db, "cafes");

  for (const c of CAFES) {
    const id = `${c.cityCode}_${c.name}`.replace(/\s+/g, "_");
    await setDoc(doc(col, id), {
      cityCode: c.cityCode,
      name: c.name,
      address: c.address,
      tags: c.tags,
      seatsHint: c.seatsHint,
      active: true,
      createdAt: serverTimestamp(),
    });
  }
  return CAFES.length;
}
