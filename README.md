# DermaSafe AI

Final-year research: **leakage-aware dermatological risk screening** (component **R26-IT-058**).

Four lesion families (acne, burns, rash, warts) and three grades (Low / Medium / High). The system is allowed to **abstain** when the top-two classes are close, and to **reject** a frame when photograph quality is too low. It is a screening aid, not a diagnosis.

A previous model sat near 57–60% test accuracy, mainly confusing Medium with Low and High. Cleaning can remove leakage and noisy files. It cannot invent a visual boundary that is not in the photographs. V5 test accuracy is about **60%**. That ceiling is part of the result.

## Technology stack

| Layer | Technologies |
|---|---|
| **Mobile frontend** | React Native + Expo + JavaScript/TypeScript |
| **Backend** | Python REST API (FastAPI) · Node.js + Express (ingredient KB) |
| **AI/ML** | TensorFlow, Keras, scikit-learn |
| **Database** | SQLite (on-device screening history & profile) |
| **Data exchange** | JSON |
| **Image processing** | OpenCV / Python (Pillow) |

```
mobile/                 Expo React Native app (primary UI)
frontend/               Browser demo UI (HTML/CSS/JS)
backend/                Python screening API (/api/v1, /docs)
services/ingredients/   Node.js ingredient knowledge-base
pipeline/               Dataset audit and rebuild code
data/raw/               Provided V5 photographs (never overwritten)
data/examples/          Labelled preview frames from the V5 notebook
pipeline_output/        Audit reports + cleaned Skin_Risk_Dataset_V4
models/                 V5 checkpoint, model card, test predictions
notebooks/              Colab pipeline + Skin_Risk_V5 training
scripts/                Linear-probe bootstrap for the UI
screenshots/            Thesis / viva screenshots (optional)
```

## Run the mobile app

Terminal 1 — Python screening API:

```bash
pip install -r requirements.txt
python -m backend
```

Terminal 2 — ingredient knowledge-base (optional):

```bash
cd services/ingredients
npm install
npm start
```

Terminal 3 — Expo mobile client:

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `a` / `i` for an emulator. On a physical phone, set `EXPO_PUBLIC_API_URL` in `mobile/.env` to your PC's LAN address (e.g. `http://192.168.1.10:8000`).

OpenAPI docs: http://127.0.0.1:8000/docs

### Legacy browser demo

Together (API serves the old web UI):

```bash
python serve.py
```

Open http://127.0.0.1:8000

Split browser demo:

```bash
python -m backend          # API on :8000
python -m frontend         # UI on :5173  → talks to :8000
```

Photograph or upload a lesion, pick acne / burns / rash / warts, and run screening. Quality checks always run. Risk grades need `models/skin_risk_v5_final.keras`, `models/best.pt` from `train_v4.py`, or `models/risk_head.npz` from `python scripts/bootstrap_web_model.py`.

### What the API returns

| `decision` | Meaning |
|---|---|
| `grade` | Confidence and margin clear the selective-prediction thresholds |
| `abstain` | Top-two classes too close — distribution is returned, not a forced winner |
| `quality_reject` | Blur / exposure / resolution failed the quality gate |
| `unavailable` | No screening head on disk; quality still ran |

V5 also reports **lesion-context ablation**: the softmax with the selected lesion one-hot versus a uniform lesion prior. That channel is an input to the model, not a UI hint.

## Research contributions

1. **Leakage-free reconstruction** — exact hashes, perceptual near-duplicates, groups kept in one split, post-rebuild leakage check.
2. **Lesion-conditioned EfficientNetV2-B0** — photograph features fused with a four-way lesion one-hot before the risk softmax.
3. **Selective screening** — grade, abstain, or reject. Forced accuracy is not the objective. Quality reject happens *before* inference.
4. **Grad-CAM** — heatmap of regions that raised the leading Low / Medium / High grade.
5. **An honest ceiling** — Medium remains weakly separable in consumer photographs.

This component is **R26-IT-058**, Member 2: Skin Risk Level Identification & Prediction. It is a screening aid, not a diagnosis.

## Dataset pipeline

Audit, review, and rebuild a skin-lesion Low / Medium / High dataset without modifying the original files.

```
data/raw/Skin_Risk_Dataset_V5_Synthetic/   provided source (read-only)
pipeline_output/
  reports/
    validation_report.csv
    duplicates_report.csv
    near_duplicates_report.csv
    quality_report.csv
    ambiguous_samples.csv
    review.csv
    dataset_manifest.csv
    dataset_statistics.csv
    leakage_report.csv
    excluded_from_v4.csv
  Review/
    ambiguous_labels/
    duplicates/
    low_quality/
    corrupted/
    possible_data_leakage/
    review.csv
  Skin_Risk_Dataset_V4/
    train|val|test / acne|burns|rash|warts / Low|Medium|High /
  README_DATASET_V4.txt
  working/image_index.csv
  logs/
```

The original `train/ val/ test/` tree is only read.

## Setup

```bash
pip install -r requirements.txt
```

Google Colab:

```python
!pip install -q pillow numpy pandas imagehash opencv-python-headless scikit-learn tqdm PyYAML
```

Install `torch` / `torchvision` only when you are ready to train.

## Run one step at a time

Point `--dataset-root` at the folder that contains `train/`, `val/`, and `test/`. `config.yaml` already points at `data/raw/Skin_Risk_Dataset_V5_Synthetic`.

```bash
python run_pipeline.py --dataset-root data/raw/Skin_Risk_Dataset_V5_Synthetic --output-root ./pipeline_output validate
python run_pipeline.py --dataset-root data/raw/Skin_Risk_Dataset_V5_Synthetic --output-root ./pipeline_output exact-dups
python run_pipeline.py --dataset-root data/raw/Skin_Risk_Dataset_V5_Synthetic --output-root ./pipeline_output near-dups
python run_pipeline.py --dataset-root data/raw/Skin_Risk_Dataset_V5_Synthetic --output-root ./pipeline_output quality
python run_pipeline.py --dataset-root data/raw/Skin_Risk_Dataset_V5_Synthetic --output-root ./pipeline_output labels
python run_pipeline.py --dataset-root data/raw/Skin_Risk_Dataset_V5_Synthetic --output-root ./pipeline_output review
```

Inspect `pipeline_output/reports/review.csv` and the `Review/` folders. Edit the `decision` column:

| decision | Meaning |
|---|---|
| `KEEP` | Include in V4 with the current label |
| `REMOVE` or `REMOVE_DUPLICATE` | Leave out of V4 |
| `CHECK_LABEL` | Held out until you change it to `KEEP` (label is never auto-changed) |
| `CHECK_QUALITY` | Held out until you change it to `KEEP` |
| `REVIEW` | Held out until you change it to `KEEP` |

Then:

```bash
python run_pipeline.py --dataset-root data/raw/Skin_Risk_Dataset_V5_Synthetic --output-root ./pipeline_output rebuild
python run_pipeline.py --dataset-root data/raw/Skin_Risk_Dataset_V5_Synthetic --output-root ./pipeline_output stats
python run_pipeline.py --dataset-root data/raw/Skin_Risk_Dataset_V5_Synthetic --output-root ./pipeline_output leakage-check
```

Or run everything:

```bash
python run_pipeline.py --dataset-root data/raw/Skin_Risk_Dataset_V5_Synthetic --output-root ./pipeline_output all
```

`--include-unreviewed` keeps flagged images in V4 (still no auto-relabel). Default is conservative: unreviewed `CHECK_LABEL` / `CHECK_QUALITY` / `REVIEW` images are held out.

## What each step does

1. **validate** – expected folders, extensions, empty files, corruption, size.
2. **exact-dups** – file SHA-256 and decoded-pixel SHA-256, entire dataset.
3. **near-dups** – pHash / dHash. Cross-split groups are leakage candidates.
4. **quality** – blur, exposure, contrast, entropy, resolution. Flags for review; no silent deletes.
5. **labels** – compares Low/Medium/High **inside the same lesion type only**. Medium vs Low/High is highlighted. No relabel.
6. **review** – copies suspects into `Review/` and writes `review.csv`.
7. **rebuild** – applies decisions, keeps near-duplicate groups in one split, stratified 70/15/15 by lesion × risk, writes `Skin_Risk_Dataset_V4/`.
8. **stats** – counts and `README_DATASET_V4.txt`.
9. **leakage-check** – repeats exact + near-dup checks on V4. Prints `DATA LEAKAGE CHECK: PASSED` only if it passed.

Class balance is reported, not manufactured. Identical images are not duplicated. Prefer class weights and **train-only** augmentation (`pipeline/augmentation.py`).

## Google Colab training (after V4 exists)

Use this only on `Skin_Risk_Dataset_V4`. Do not train on the original leaked splits.

```python
# 1. Runtime → GPU
# 2. Mount Drive if the dataset lives there
from google.colab import drive
drive.mount("/content/drive")

# 3. Install training deps (pipeline deps if you also run cleaning here)
!pip install -q pillow numpy pandas imagehash opencv-python-headless scikit-learn tqdm PyYAML
# torch/torchvision are usually preinstalled on Colab

# 4. Upload or clone this repo, then:
%cd /content/vinu

# 5. Paths
DATASET_V4 = "/content/drive/MyDrive/Skin_Risk_Dataset_V4"  # or pipeline_output/Skin_Risk_Dataset_V4
OUTPUT = "/content/training_output"

# 6. Train. Val is for early stopping only. Test is evaluated once at the end.
!python train_v4.py --data-root "$DATASET_V4" --output-dir "$OUTPUT" --epochs 20 --batch-size 16 --seed 42
```

`train_v4.py` does the following:

- EfficientNet-B0 (ImageNet), fallback ResNet-18
- Labels = Low / Medium / High (lesion folders are flattened)
- Conservative train augmentation only (flip, ±10° rotate, mild zoom/translate, ±10% brightness/contrast)
- Inverse-frequency class weights + weighted sampler
- Early stopping on **validation** accuracy
- One **test** pass on the best validation checkpoint
- Per-class precision / recall / F1 and a confusion matrix
- Training accuracy is printed as training accuracy, not test accuracy

If Medium is still mixed with Low and High on a clean, leakage-free test set, report that limitation. Do not move test images into train or rewrite labels to force 90%.
