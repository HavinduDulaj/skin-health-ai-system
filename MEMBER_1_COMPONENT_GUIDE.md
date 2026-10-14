# Member 1 — Skin image detection and main application

Technical overview • 10 October 2026 • Based on the current source code and saved model metadata.

## 1. What this component does

Member 1 provides the main DermaSafe app and its skin-condition image classifier. Users register/sign in, complete a skin profile, capture or upload a photograph, and receive a predicted condition with model scores, uncertainty indicators and a Grad-CAM image explanation. The app also displays history and connects results to the other members' modules.

The classifier recognizes five labels: **acne, burns, healthy, rashes and warts**. It is a closed-set research classifier: it chooses among these labels, not every possible skin disease. Image validation is a heuristic input filter, not a guaranteed detector of all unsupported images.

Member 1 owns condition classification. Member 2 supplies risk assessment. Member 3 supplies ingredient recommendations, ingredient chat and knowledge management. Although these appear inside one app, they are distinct components.

## 2. Exact locations

Main component folder:

`D:\Research\Research\Integrated one\first part\skin-project-skin-clean`

Paths in the following tables are relative to that folder.

| Location | Purpose |
|---|---|
| `frontend/` | Active Expo React Native application |
| `frontend/App.tsx`, `frontend/index.js` | Frontend application entry files |
| `frontend/src/screens/` | Account, profile, capture, upload, results and settings screens |
| `frontend/src/navigation/AppNavigator.tsx` | Main screen navigation |
| `frontend/src/services/` | API calls and local persistence |
| `frontend/src/context/` | Account/session and theme state |
| `frontend/src/components/` | Reusable buttons, inputs, cards and design components |
| `frontend/src/theme/theme.ts` | Theme palette |
| `frontend/src/types/index.ts` | Shared TypeScript data/navigation types |
| `backend/app.py` | Flask API entry point and integration orchestration |
| `backend/src/predict.py` | Image inference, uncertainty and Grad-CAM |
| `backend/src/image_validation.py` | Skin-colour and photo-quality checks |
| `backend/src/train.py` | Dataset preparation, training and evaluation |
| `backend/src/users.py` | JSON account persistence and password checking |
| `backend/models/` | Model artifact, metadata and evaluation outputs |
| `backend/dataset/` | Training/validation/test image directories used by the code |
| `backend/data/users.json` | Backend account records; do not publish this file |
| `paper_icac2026/` | Research-paper material and supporting figures |

The integrated Member 3 UI lives in `frontend/src/bubus/`; its location inside Member 1's frontend does not make it part of the Member 1 classifier.

## 3. Technology stack

Versions below are declared in package.json/requirements.txt, not a fresh inventory of installed packages.

| Technology | Declared version | Used for |
|---|---|---|
| Python | Existing local runtime previously tested with 3.10 | Backend and ML scripts |
| Flask | 3.1.0 | HTTP API in `backend/app.py` |
| Flask-CORS | 5.0.1 | Cross-origin frontend/API requests |
| TensorFlow / Keras | TensorFlow 2.19.0 | MobileNetV2 training, model loading and inference |
| NumPy | 2.1.3 | Image arrays, scores, augmentation and entropy |
| Pillow | 11.1.0 | Image verification, RGB conversion, resize and heatmap output |
| OpenCV headless | 4.10.0.84 | Skin-colour, brightness and sharpness validation |
| Matplotlib | 3.10.1 | Training/evaluation figures |
| scikit-learn | 1.8.0 | Evaluation utilities, including classification reports |
| pandas / PyYAML | 2.2.3 / 6.0.2 | Dependencies needed by imported integrated risk code |
| joblib | 1.4.2 | Supporting model tooling dependency |
| Werkzeug | Flask dependency | Password hashing and verification |
| React / React DOM | 19.1.0 | Frontend component rendering |
| React Native | 0.81.5 | Mobile-oriented UI components |
| React Native Web | ^0.21.0 | Browser rendering |
| Expo | ~54.0.33 | Development server and app/device integration |
| TypeScript | ~5.9.2 | Frontend typing and checking |
| React Navigation | Native ^7.1.18, native-stack ^7.3.28 | Screen routing |
| Expo Camera | ~17.0.10 | Camera capture |
| Expo Image Picker / Document Picker | ~17.0.10 / ~14.0.8 | Image/file selection across the integrated app |
| AsyncStorage | 2.2.0 | Local session, profiles, history and preferences |

There is no SQL database in the inspected Member 1 implementation: backend accounts use JSON files, while app profile/history/settings data use AsyncStorage. Member 3's FastAPI and scikit-learn model are separate from Member 1's Flask/TensorFlow service.

## 4. User-facing screens

| File under `frontend/src/screens/` | Responsibility |
|---|---|
| `LandingScreen.tsx` | App introduction and entry actions |
| `RegisterScreen.tsx`, `SignInScreen.tsx` | Account creation and login |
| `ProfileSetupScreen.tsx`, `UserProfileScreen.tsx` | Skin/personal profile creation and viewing |
| `DashboardScreen.tsx` | Main workflow entry |
| `CameraCaptureScreen.tsx` | Capture a skin image |
| `UploadImageScreen.tsx` | Choose a photo and submit analysis |
| `ResultScreen.tsx` | Condition results and downstream navigation |
| `RiskResultScreen.tsx` | Integrated Member 2 risk presentation |
| `IngredientRecommendationScreen.tsx` | Adapter into Member 3 navigation |
| `HistoryScreen.tsx` | Locally stored previous results |
| `SettingsScreen.tsx` | App preferences |

`AuthContext.tsx` coordinates account/session state. `ThemeContext.tsx` supplies theme/preferences. `analysisService.ts` prepares image requests; `authService.ts` sends account requests; `storageService.ts` manages local JSON-serialized AsyncStorage values, including per-email profiles and history.

## 5. Image analysis flow

1. A user captures/selects a photograph in the frontend.
2. `analysisService.ts` sends multipart form data to `/api/analysis/upload`, including an `image` and optional JSON `clinicalMetadata`.
3. Flask checks that an image exists and validates the upload format. The total request limit is 10 MB.
4. The image is saved under a unique filename in the operating-system temporary directory and verified with Pillow.
5. `validate_skin_image()` checks image size, colour-based skin coverage, brightness and focus.
6. `predict_image()` converts to RGB, resizes to 224 × 224 and runs the MobileNetV2 model.
7. When enabled, inference averages the original image, horizontal flip, slightly brighter version and slightly darker version (test-time augmentation).
8. The response includes the winning condition, top three predictions, confidence band, normalized entropy and a review-required flag. Grad-CAM is attempted; its failure is recorded without discarding the classification.
9. The backend calls Member 2's risk engine and merges its output. The healthy-class override then applies when relevant.
10. JSON returns to the frontend. The temporary upload is removed in a finally block, including after failures.

Allowed filename extensions include JPG/JPEG, PNG, WebP and BMP. An image MIME type can also pass the initial acceptance check, but Pillow must still decode the file. Mapping an HEIC MIME type to a JPG suffix does not itself provide HEIC decoding support.

## 6. Model and training

Model artifact: `backend/models/skin_model_mobilenet.keras`.

Metadata: `backend/models/skin_model_mobilenet_metadata.json`.

The training code builds an ImageNet-pretrained **MobileNetV2** backbone without its original classifier, followed by global average pooling, batch normalization, a 256-unit ReLU dense layer with L2 regularization, dropout of 0.45 and a five-class softmax output.

Training starts with the backbone frozen, then fine-tunes it. Metadata records 12 initial epochs and 18 fine-tuning epochs, batch size 16 and seed 42. These are configured stage lengths, not proof that every epoch completed. The code uses AdamW; learning rates are 0.0003 initially and 0.00005 for fine-tuning. Training augmentation includes horizontal flips, rotation, zoom, translation, contrast and brightness variation. Evaluation includes classification metrics, confusion matrices and calibration summaries.

Metadata records training counts of 70 acne, 70 burns, 69 healthy, 70 rashes and 69 warts images: **348 training images**. These are saved metadata counts, not a newly counted filesystem inventory.

Recorded best validation accuracy is **89.33%**. Metadata's best top-two accuracy is 100%, whereas `evaluation_summary.json` records 97.33% validation top-two accuracy. These are different saved summaries; do not present them as one identical evaluation or as new measurements. No retraining, dataset-source verification or independent clinical evaluation was performed for this document.

The runtime caches the model and metadata. It creates a compatibility copy under `backend/models/_runtime/` that removes unsupported `quantization_config` entries; it retains the original artifact.

## 7. Validation and explainability

Image gate thresholds in `image_validation.py`:

| Check | Current threshold |
|---|---|
| Minimum width/height | 96 × 96 pixels |
| Estimated skin coverage | At least 20% |
| Mean brightness | 28–238 |
| Sharpness | Laplacian variance at least 12 |

The skin gate combines RGB, YCrCb and HSV conditions. Its behaviour can vary with lighting and skin appearance; it is not independently validated by this documentation.

Uncertainty uses normalized prediction entropy. The review flag is true if confidence is below 0.70, entropy above 0.55, or the top-two probability margin below 0.20. Grad-CAM generates a JPEG overlay returned as a base64 data URI; it highlights model-influential image regions, not a verified lesion boundary.

## 8. API endpoints and output

Default backend: `http://localhost:5000`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Basic service response; does not prove model readiness |
| POST | `/api/auth/register` | Register account and return sanitized user |
| POST | `/api/auth/login` | Verify credentials and return sanitized user |
| GET | `/api/users` | List sanitized accounts |
| POST | `/api/analysis/upload` | Validate image, classify and integrate risk |

Registration requires fullName, email and password. Passwords are hashed with Werkzeug; password_hash is omitted from returned user records. The inspected routes do not implement token-based authorization, so sanitized account listing is not the same as access-controlled account listing.

Core result fields: `condition`, `confidence` (0–1), `confidenceBand`, `uncertainty`, `reviewRequired`, `top_predictions`, `modelInfo`, `gradCam`, and `imageValidation`. Integrated risk adds `riskLevel`, `riskScore`, `riskConfidence`, `suggestedAction`, `riskScores`, `riskFactors`, quality/explanation/model fields or a risk warning.

Missing/invalid image requests return 400; rejected skin/quality validation returns 422 with `INVALID_SKIN_IMAGE`; general inference failures return 500. Flask enforces the request-size limit separately. The frontend analysis timeout is 180 seconds.

## 9. Integration boundaries

Member 2 location: `D:\Research\Research\Integrated one\second part\skin-health-ai-system\risk-level-analysis`. Member 1 imports `backend.engine.assess_image`, passing image bytes and the predicted lesion with explanation enabled. Although clinicalMetadata is parsed and passed into the wrapper, the inspected wrapper does not forward it to assess_image. Do not claim that symptoms necessarily influence the current risk model.

When classification returns healthy, `apply_healthy_skin_guidance()` inserts fixed Low risk, score 5 and confidence 95 values. These are code-defined values, not independently computed risk-model estimates.

Member 3 backend: `D:\Research\Research\Integrated one\third part\ingredient-recommendation-system\backend`, normally port 8001. Its UI is `frontend/src/bubus`. The adapter passes condition, risk and profile into that module. Unsupported/healthy or uncertain scan results now display an unavailable state rather than silently being converted to Acne/Low.

## 10. Running the component

Backend, from the main component folder:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

Frontend, in a separate terminal from the main component folder:

```powershell
cd frontend
npm install
npm run web
```

The usual web address is `http://localhost:8081`. Use `npm start` for Expo's device workflow. Model files must exist before analysis can work. The integrated risk folder and its runtime dependencies must also be available. Start Member 3 separately for ingredient services.

`analysisService.ts` resolves the backend host from browser location, Expo host or script URL. Its Android fallback is currently the hardcoded LAN address `10.119.173.206`; update configuration if that no longer matches the backend machine. Flask binds to 0.0.0.0:5000 in the current entry point. Phone access also depends on LAN/firewall configuration.

Dependency versions in requirements may differ from installed environments used elsewhere in the integrated project; verify compatibility in an isolated environment rather than assuming all three members share the same dependency constraints.

## 11. Verification, maintenance and limitations

- Frontend type check: run `npx tsc --noEmit` in frontend.
- Service check: request `/api/health`, then separately submit a valid test photo to verify model loading and inference.
- Check negative cases: missing file, non-image data, undersized/dark/blurry photos and oversized requests.
- Check account creation/login, local profile persistence, history, image upload/camera, result navigation and downstream risk/ingredient behaviour.
- Preserve the model, metadata and evaluation files together when updating models. Restart the backend to clear cached model state.
- Do not run `src/train.py` merely to launch the app: it trains and writes artifacts, and its preparation code converts/removes dataset files.
- Local history/profile storage is device/browser-specific, not a server-synchronized clinical record.
- The image gate, confidence score and healthy override do not establish diagnosis or clinical safety. The small recorded training set and independent evaluation requirements should be stated in research presentations.

This document was produced by source inspection. It does not certify current service uptime, all-device UI testing, medical validity, dataset licensing, or production security.

## 12. Short presentation explanation

“Member 1 is the skin-image detection component of DermaSafe. We built the interface with React Native, Expo and TypeScript, and the API with Python Flask. Users upload or capture a skin image, which passes OpenCV quality checks and is classified by a TensorFlow MobileNetV2 transfer-learning model into five supported categories. The app displays model scores, uncertainty and a Grad-CAM explanation. It connects the condition result to Member 2 for risk analysis and Member 3 for ingredient recommendations. Accounts use JSON storage and password hashing, while profile and history data are stored locally in the app.”
