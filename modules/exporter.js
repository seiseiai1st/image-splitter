/**
 * exporter.js - 分割画像のエクスポート・ZIPダウンロード
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export class Exporter {
    constructor() {
        this.splitBtn = document.getElementById('split-btn');
        this.downloadBtn = document.getElementById('download-btn');
        this.resultArea = document.getElementById('result-area');
        this.resultGrid = document.getElementById('result-grid');
        this.progressOverlay = document.getElementById('progress-overlay');
        this.progressText = document.getElementById('progress-text');
        this.progressBar = document.getElementById('progress-bar');

        this.outputFormat = document.getElementById('output-format');
        this.outputQuality = document.getElementById('output-quality');
        this.qualityValue = document.getElementById('quality-value');
        this.qualityGroup = document.getElementById('quality-group');

        this.blobs = []; // 分割結果のBlob配列
        this.image = null;
        this.getRegions = null;
        this.imageName = '';

        this._bindEvents();
    }

    _bindEvents() {
        this.outputFormat.addEventListener('change', () => {
            const fmt = this.outputFormat.value;
            this.qualityGroup.style.display = (fmt === 'jpeg' || fmt === 'webp') ? '' : 'none';
        });

        this.outputQuality.addEventListener('input', () => {
            this.qualityValue.textContent = this.outputQuality.value + '%';
        });

        this.downloadBtn.addEventListener('click', () => {
            this._downloadZip();
        });
    }

    setImage(img, name) {
        this.image = img;
        this.imageName = name.replace(/\.[^.]+$/, '');
    }

    setRegionsGetter(fn) {
        this.getRegions = fn;
    }

    async split() {
        if (!this.image || !this.getRegions) return;

        const regions = this.getRegions();
        if (regions.length === 0) {
            alert('分割領域がありません。設定を確認してください。');
            return;
        }

        // プログレス表示
        this.progressOverlay.classList.remove('hidden');
        this.progressBar.style.width = '0%';
        this.progressText.textContent = '分割処理中...';

        this.blobs = [];
        this.resultGrid.innerHTML = '';

        const format = this.outputFormat.value;
        const mimeType = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
        const quality = (format === 'jpeg' || format === 'webp') ? parseInt(this.outputQuality.value) / 100 : undefined;
        const ext = format === 'png' ? 'png' : format === 'jpeg' ? 'jpg' : 'webp';

        for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            const blob = await this._extractRegion(region, mimeType, quality);
            this.blobs.push({ blob, name: `${this.imageName}_${String(i + 1).padStart(3, '0')}.${ext}` });

            // プログレス更新
            const progress = ((i + 1) / regions.length) * 100;
            this.progressBar.style.width = progress + '%';
            this.progressText.textContent = `分割中... ${i + 1} / ${regions.length}`;

            // UIが更新されるように一瞬待つ
            if (i % 5 === 0) {
                await new Promise(r => setTimeout(r, 0));
            }
        }

        // プログレス完了
        this.progressText.textContent = '完了！';
        await new Promise(r => setTimeout(r, 300));
        this.progressOverlay.classList.add('hidden');

        // 結果表示
        this._showResults(ext);

        // ダウンロードボタン表示
        this.downloadBtn.classList.remove('hidden');
    }

    _extractRegion(region, mimeType, quality) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = region.w;
            canvas.height = region.h;
            const ctx = canvas.getContext('2d');

            ctx.drawImage(
                this.image,
                region.x, region.y, region.w, region.h,
                0, 0, region.w, region.h
            );

            canvas.toBlob((blob) => {
                resolve(blob);
            }, mimeType, quality);
        });
    }

    _showResults(ext) {
        this.resultArea.classList.remove('hidden');
        this.resultGrid.innerHTML = '';

        this.blobs.forEach((item, idx) => {
            const url = URL.createObjectURL(item.blob);
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `
        <img src="${url}" alt="分割画像 ${idx + 1}" />
        <div class="result-label">${item.name}</div>
        <button class="result-download" title="個別ダウンロード">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      `;

            // 個別ダウンロード
            div.querySelector('.result-download').addEventListener('click', (e) => {
                e.stopPropagation();
                saveAs(item.blob, item.name);
            });

            this.resultGrid.appendChild(div);
        });
    }

    async _downloadZip() {
        if (this.blobs.length === 0) return;

        this.progressOverlay.classList.remove('hidden');
        this.progressText.textContent = 'ZIP生成中...';
        this.progressBar.style.width = '50%';

        const zip = new JSZip();
        this.blobs.forEach(item => {
            zip.file(item.name, item.blob);
        });

        const content = await zip.generateAsync({ type: 'blob' });

        this.progressBar.style.width = '100%';
        this.progressText.textContent = 'ダウンロード開始...';
        await new Promise(r => setTimeout(r, 200));
        this.progressOverlay.classList.add('hidden');

        saveAs(content, `${this.imageName}_split.zip`);
    }
}
