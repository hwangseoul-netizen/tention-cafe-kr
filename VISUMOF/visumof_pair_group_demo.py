import pathlib
import pandas as pd

"""
VISUMOF 전후사진 페어 세트 만들기 데모 v1

1) 같은 폴더에 `2차_전후후보_리스트.xlsx` 가 있어야 합니다.
   - 컬럼: Index, 상호명, 페이지URL, 이미지URL, 패턴 (before/after)
2) 터미널에서:
   python visumof_pair_group_demo.py
3) 실행 후:
   `3차_전후세트_리스트.xlsx` 생성
   - 컬럼: Index, 상호명, 페이지URL, beforeURL, afterURL
"""

IN_FILE = "2차_전후후보_리스트.xlsx"
OUT_FILE = "3차_전후세트_리스트.xlsx"

def main():
    path = pathlib.Path(IN_FILE)
    if not path.exists():
        print(f"[ERROR] `{IN_FILE}` 파일이 폴더에 없습니다.")
        return

    df = pd.read_excel(path)

    required = {"Index","상호명","페이지URL","이미지URL","패턴"}
    missing = required - set(df.columns)
    if missing:
        print(f"[ERROR] 엑셀 컬럼 부족: {missing}")
        print("현재 컬럼:", list(df.columns))
        return

    # before / after 분리
    before_df = df[df["패턴"] == "before"].copy()
    after_df  = df[df["패턴"] == "after"].copy()

    # 키: Index + 페이지URL 기준으로 조인
    key_cols = ["Index","페이지URL"]

    merged = pd.merge(
        before_df,
        after_df,
        on=key_cols,
        how="outer",
        suffixes=("_before","_after")
    )

    # 보기 좋게 정리
    out_rows = []
    for _, row in merged.iterrows():
        out_rows.append(
            {
                "Index": row.get("Index"),
                "상호명": row.get("상호명_before") or row.get("상호명_after"),
                "페이지URL": row.get("페이지URL"),
                "beforeURL": row.get("이미지URL_before"),
                "afterURL": row.get("이미지URL_after"),
            }
        )

    out_df = pd.DataFrame(out_rows)
    out_df.to_excel(OUT_FILE, index=False)
    print(f"[DONE] 전후 세트 {len(out_df)}건 생성 → {OUT_FILE}")

if __name__ == "__main__":
    main()
