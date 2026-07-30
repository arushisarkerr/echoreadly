# PDFium production notes

EchoReadly extracts PDF text with **pdfium-native** (shared library) loaded through **koffi** on the **Node.js** server runtime.

Extraction logic is unchanged: character-level PDFium APIs → optional OCR fallback when text is empty.

## Requirements

- Node.js **≥ 22** (see `pdfium-native` engines)
- Native binary present after `npm install` (postinstall downloads platform libs)
- Route handlers / processing must run on the **Node.js** runtime (not Edge)
- `serverExternalPackages: ["koffi", "pdfium-native"]` in `next.config.ts` (already set)

## Validate on a host

```bash
npm install
npm run check:pdfium
npm run build
```

`check:pdfium` confirms the shared library exists and that koffi can call `FPDF_InitLibrary`. It does **not** change extraction behavior.

## Compatibility matrix

| Target | Status | Notes |
| --- | --- | --- |
| **Local Node** (`next dev` / `next start`) | **Supported** | Verified path: `node_modules/pdfium-native/build/Release/libpdfium.*` + koffi load. |
| **Self-hosted VPS / bare metal Node** | **Supported** | Use matching OS/arch; keep `node_modules` from install on that machine (or rebuild). Prefer `output: "standalone"` only if native libs are copied beside the server. |
| **Docker (Node image)** | **Partially supported** | Supported when the image OS/arch matches pdfium-native binaries and glibc is compatible (prefer `node:22-bookworm`, not alpine/musl unless you verify). Run `npm run check:pdfium` in the image build/CI. |
| **Vercel (Node serverless)** | **Not supported** (recommended) | Native FFI + large shared libs are unreliable/unsupported for this stack; cold starts and binary packaging break extraction. Deploy processing on a Node VPS/container instead, or keep the whole app off Vercel. |
| **Vercel Edge / Next Edge runtime** | **Not supported** | koffi cannot load native code on Edge. |
| **Other serverless (Lambda, Cloud Functions)** | **Not supported** without custom layers | Same native packaging constraints as Vercel serverless. |

## Failure behavior

If the library is missing or koffi fails to load:

- Extraction returns `native_unavailable` / `native_error` (not a silent empty PDF).
- Document APIs surface a **503**-style processing error asking operators to deploy on a Node host with pdfium-native binaries.

## Ops checklist before launch

1. Run `npm run check:pdfium` on the **production OS/arch**.
2. Confirm summarize/chat/page-TTS succeed on a real PDF.
3. Do not force Edge runtime on `/api/documents/*`.
4. After deploy, re-run the check inside the running container/host.
