import pathlib
import cv2
import shutil

"""
VISUMOF 얼굴 포함 전후 필터 데모 v1

기능:
- visumof_pairs 폴더 안의 이미지들을 모두 검사해서
- 얼굴이 1개 이상 검출된 이미지들만 visumof_pairs_faces 폴더로 복사

사전 준비:
1) pip install opencv-python
2) 같은 폴더(VISUMOF)에 haarcascade_frontalface_default.xml 파일을 둔다.
   (OpenCV에서 제공하는 기본 얼굴 검출용 XML)

사용 방법:
1) 이 파일을 visumof_face_filter_demo.py 이름으로 VISUMOF 폴더에 둔다.
2) 터미널에서:
   python visumof_face_filter_demo.py
3) 실행 후:
   visumof_pairs_faces 폴더 안에 "얼굴이 실제로 있는" 이미지들만 모인다.
"""

CASCADE_FILE = "haarcascade_frontalface_default.xml"
PAIR_DIR = "visumof_pairs"
OUT_DIR = "visumof_pairs_faces"

def main():
    base = pathlib.Path(".")
    cascade_path = base / CASCADE_FILE
    if not cascade_path.exists():
        print(f"[ERROR] {CASCADE_FILE} 파일이 없습니다. 같은 폴더에 내려받아 둔 뒤 다시 실행해 주세요.")
        return

    pair_dir = base / PAIR_DIR
    if not pair_dir.exists():
        print(f"[ERROR] {PAIR_DIR} 폴더가 없습니다.")
        return

    out_dir = base / OUT_DIR
    out_dir.mkdir(exist_ok=True)

    face_cascade = cv2.CascadeClassifier(str(cascade_path))

    exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

    total = 0
    kept = 0

    for img_path in pair_dir.glob("*"):
        if img_path.suffix.lower() not in exts:
            continue

        total += 1
        img = cv2.imread(str(img_path))
        if img is None:
            print(f"[WARN] 이미지를 열 수 없음: {img_path.name}")
            continue

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.2, 5)

        if len(faces) > 0:
            kept += 1
            dst = out_dir / img_path.name
            shutil.copy2(img_path, dst)
            print(f"[KEEP] {img_path.name} (faces={len(faces)})")
        else:
            print(f"[SKIP] {img_path.name} (no face)")

    print(f"[DONE] 총 {total}장 중 얼굴 포함 {kept}장 → {OUT_DIR} 폴더 확인")

if __name__ == "__main__":
    main()
