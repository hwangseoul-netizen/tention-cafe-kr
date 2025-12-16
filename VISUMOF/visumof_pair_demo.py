import pathlib
import pandas as pd

"""
VISUMOF 전후사진 후보 추출 데모 v1

1) 같은 폴더에 `1차_이미지URL_리스트.xlsx` 를 둔다.
2) 터미널에서:  python visumof_pair_demo.py
3) 실행 후 `2차_전후후보_리스트.xlsx` 생김
   - 전/후 패턴이 의심되는 이미지들만 모아둔 파일
"""

IN_FILE = "1차_이미지URL_리스트.xlsx"
OUT_FILE = "2차_전후후보_리스트.xlsx"


def flag_before_after(url: str):
    if not isinstance(url, str):
        return "unknown"

    u = url.lower()

    # 쿼리스트링 제거
    u = u.split("?")[0]

    # 파일명만 추출
    filename = u.rsplit("/", 1)[-1]

    before_keywords = ["before", "befor", "_b.", "-b.", "_bf", "-bf"]
    after_keywords = ["after", "afte", "_a.", "-a.", "_af", "-af"]

    for kw in before_keywords:
        if kw in filename:
            return "before"

    for kw in after_keywords:
        if kw in filename:
            return "after"

    return "unknown"


def main():
    path = pathlib.Path(IN_FILE)
    if not path.exists():
        print(f"[ERROR] `{IN_FILE}` 파일이 폴더에 없습니다.")
        return

    df = pd.read_excel(path)

    required = {"Index", "상호명", "페이지URL", "이미지URL"}
    missing = required - set(df.columns)
    if missing:
        print(f"[ERROR] 엑셀 컬럼 부족: {missing}")
        print("현재 컬럼:", list(df.columns))
        return

    df = df.copy()
    df["패턴"] = df["이미지URL"].apply(flag_before_after)

    cand = df[df["패턴"].isin(["before", "after"])].copy()

    if cand.empty:
        print("[INFO] 전후 의심 패턴이 있는 이미지를 찾지 못했습니다.")
    else:
        cand.to_excel(OUT_FILE, index=False)
        print(f"[DONE] 전후 후보 {len(cand)}건 → {OUT_FILE}")


if __name__ == "__main__":
    main()
