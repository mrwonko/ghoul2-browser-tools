import { convertGlm } from './converter.js';
import { parseHeader } from './glm.js';

const EXPECTED_ANIM = 'models/players/_humanoid/_humanoid';

const dropZone    = document.getElementById('dropZone')!;
const fileInput   = document.getElementById('fileInput')  as HTMLInputElement;
const fileChip    = document.getElementById('fileChip')!;
const chipName    = document.getElementById('chipName')!;
const chipSize    = document.getElementById('chipSize')!;
const clearBtn    = document.getElementById('clearFile')!;
const convertBtn  = document.getElementById('btnConvert') as HTMLButtonElement;
const statusEl    = document.getElementById('status')!;
const downloadBtn = document.getElementById('btnDownload') as HTMLAnchorElement;

let selectedFile: File | null = null;
let blobUrl: string | null = null;

function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

function setFile(file: File): void {
  selectedFile = file;
  chipName.textContent = file.name;
  chipSize.textContent = formatSize(file.size);
  fileChip.classList.add('visible');
  convertBtn.disabled = false;
  clearResult();
}

function clearSelection(): void {
  selectedFile = null;
  fileInput.value = '';
  fileChip.classList.remove('visible');
  convertBtn.disabled = true;
  clearResult();
}

function clearResult(): void {
  statusEl.className = 'status';
  if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
  downloadBtn.classList.remove('visible');
}

function showStatus(type: string, msg: string): void {
  statusEl.className = `status visible ${type}`;
  statusEl.textContent = msg;
}

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = (e as DragEvent).dataTransfer?.files[0];
  if (file) setFile(file);
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) setFile(file);
});

clearBtn.addEventListener('click', e => { e.preventDefault(); clearSelection(); });

convertBtn.addEventListener('click', async () => {
  if (!selectedFile) return;
  convertBtn.disabled = true;
  showStatus('info', 'Converting…');
  try {
    const data = new Uint8Array(await selectedFile.arrayBuffer());
    const { animName } = parseHeader(data);
    if (animName !== EXPECTED_ANIM) {
      const proceed = confirm(
        `This model uses skeleton "${animName}" instead of the expected "${EXPECTED_ANIM}".\n\nThe conversion may produce incorrect results. Proceed anyway?`
      );
      if (!proceed) {
        convertBtn.disabled = false;
        clearResult();
        return;
      }
    }
    convertGlm(data);
    blobUrl = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }));
    downloadBtn.href     = blobUrl;
    downloadBtn.download = selectedFile.name;
    downloadBtn.textContent = `Download ${selectedFile.name}`;
    downloadBtn.classList.add('visible');
    showStatus('ok', 'Conversion successful.');
  } catch (err) {
    showStatus('error', `Error: ${err instanceof Error ? err.message : String(err)}`);
    convertBtn.disabled = false;
  }
});
