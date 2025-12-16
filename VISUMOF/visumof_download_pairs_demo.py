import os
import pathlib
import mimetypes
import requests
import pandas as pd

"""
VISUMOF 전후 이미지 실제 파일로 내려받기 데모 v1

1) 같은 폴더에 `3차_전후세트_리스트.xlsx` 가 있어야 합니다.
   - 컬럼: Index, 상호명, 페이지URL, beforeURL, afterURL
2) 터미널에서:
   python visumof_download_pairs_demo.py
3) 실행 후:
   ./visumof_pairs/ 폴더 안에
   - {Index}_before.jpg
   - {Index}_after.jpg
   같은 파일들이 생성됩니다.
"""

IN_FILE = "3차_전후세트_리스트.xlsx"
OUT_DIR = "visumof_pairs"
MAX_PAIRS = 100  # 테스트용, 필요하면 숫자 늘리기

def guess_ext_from_url(url: str) -> str:
    url = url.split("?")[0]
    if "." in url.rsplit("/", 1)[-1]:
        ext = "." + url.rsplit(".", 1)[-1]
        if len(ext) <= 5:
            return ext
    return ".jpg"

def download_image(url: str, out_path: pathlib.Path, session: requests.Session, timeout=15):
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; VISUMOF-Bot/1.0)"
    }
    try:
        resp = session.get(url, headers=headers, timeout=timeout, stream=True)
        resp.raise_for_status()
        with open(out_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                if not chunk:
                    continue
                f.write(chunk)
        return True
    except Exception as e:
        print(f"  -> DOWNLOAD ERROR ({url}): {e}")
        return False

def main():
    path = pathlib.Path(IN_FILE)
    if not path.exists():
        print(f"[ERROR] `{IN_FILE}` 파일을 찾을 수 없습니다.")
        return

    df = pd.read_excel(path)

    required = {"Index","beforeURL","afterURL"}
    missing = required - set(df.columns)
    if missing:
        print(f"[ERROR] 엑셀 컬럼 부족: {missing}")
        print("현재 컬럼:", list(df.columns))
        return

    out_dir = pathlib.Path(OUT_DIR)
    out_dir.mkdir(exist_ok=True)

    session = requests.Session()

    count_pairs = 0
    for _, row in df.iterrows():
        if count_pairs >= MAX_PAIRS:
            break

        idx = row["Index"]
        b_url = row.get("beforeURL")
        a_url = row.get("afterURL")

        if not isinstance(b_url, str) and not isinstance(a_url, str):
            continue

        print(f"[{idx}] pair #{count_pairs+1}")

        if isinstance(b_url, str) and b_url.strip():
            b_ext = guess_ext_from_url(b_url)
            b_path = out_dir / f"{idx}_before{b_ext}"
            download_image(b_url, b_path, session)

        if isinstance(a_url, str) and a_url.strip():
            a_ext = guess_ext_from_url(a_url)
            a_path = out_dir / f"{idx}_after{a_ext}"
            download_image(a_url, a_path, session)

        count_pairs += 1

    print(f"[DONE] 총 {count_pairs}개 전후 페어 다운로드 시도 완료 → {OUT_DIR}/ 폴더 확인")

if __name__ == "__main__":
    main()
