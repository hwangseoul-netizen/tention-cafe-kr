import time
import pathlib
import requests
import pandas as pd
from bs4 import BeautifulSoup

"""
VISUMOF 전후사진 크롤링 데모 스크립트 v1

사용 방법:
1) 같은 폴더에 `크롤링시드_대표URL있는업체만_minimal.xlsx` 파일을 둔다.
2) 터미널/명령프롬프트에서:
   python visumof_crawl_demo.py
3) 실행이 끝나면 `1차_이미지URL_리스트.xlsx` 가 생성된다.
   - 컬럼: Index, 상호명, 페이지URL, 이미지URL
"""

SEED_FILE = "크롤링시드_대표URL있는업체만_minimal.xlsx"
OUT_FILE = "1차_이미지URL_리스트.xlsx"

def fetch_html(idx, name, url, session, timeout=10):
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; VISUMOF-Bot/1.0; +https://visumof.example)"
    }
    try:
        print(f"[{idx}] {name} -> {url}")
        resp = session.get(url, headers=headers, timeout=timeout)
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        print(f"  -> ERROR: {e}")
        return None

def extract_image_urls(html, base_url=None):
    soup = BeautifulSoup(html, "html.parser")
    imgs = []
    for img in soup.find_all("img"):
        src = img.get("src") or ""
        src = src.strip()
        if not src:
            continue
        # data-url 같은 다른 속성도 후에 확장 가능
        imgs.append(src)
    return imgs

def main():
    seed_path = pathlib.Path(SEED_FILE)
    if not seed_path.exists():
        print(f"[ERROR] `{SEED_FILE}` 파일을 같은 폴더에 두고 다시 실행해줘.")
        return

    df = pd.read_excel(seed_path)
    required_cols = {"Index", "상호명", "대표URL"}
    if not required_cols.issubset(df.columns):
        print(f"[ERROR] 엑셀에 {required_cols} 컬럼이 필요해. 현재 컬럼: {list(df.columns)}")
        return

    rows = []
    session = requests.Session()

    for i, row in df.iterrows():
        idx = row["Index"]
        name = str(row["상호명"])
        url = str(row["대표URL"]).strip()

        if not url or url.lower() == "nan":
            continue

        html = fetch_html(idx, name, url, session)
        if not html:
            continue

        img_urls = extract_image_urls(html, base_url=url)

        for img in img_urls:
            rows.append(
                {
                    "Index": idx,
                    "상호명": name,
                    "페이지URL": url,
                    "이미지URL": img,
                }
            )

        # 너무 공격적으로 안 때리게 딜레이 (필요에 따라 줄이거나 늘릴 수 있음)
        time.sleep(1)

    if not rows:
        print("[INFO] 추출된 이미지가 없습니다.")
        return

    out_df = pd.DataFrame(rows)
    out_df.to_excel(OUT_FILE, index=False)
    print(f"[DONE] 총 {len(out_df)}개의 이미지 URL 추출 완료 → {OUT_FILE}")

if __name__ == "__main__":
    main()
