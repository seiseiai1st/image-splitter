/**
 * grid-mode.js - グリッドモード（行×列で均等分割）
 * クロップハンドル対応
 */

import { CropHandles } from './crop-handles.js';

export class GridMode {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;

        this.colsInput = document.getElementById('grid-cols');
        this.rowsInput = document.getElementById('grid-rows');
        this.gapInput = document.getElementById('grid-gap');
        this.gapValue = document.getElementById('grid-gap-value');
        this.totalEl = document.getElementById('grid-total');
        this.pieceSizeEl = document.getElementById('grid-piece-size');
        this.cropInfoEl = document.getElementById('grid-crop-info');

        // クロップハンドル
        this.cropHandles = new CropHandles(canvasManager, (cropRect) => {
            this._update();
        });

        this._bindEvents();
    }

    _bindEvents() {
        const update = () => this._update();

        this.colsInput.addEventListener('input', update);
        this.rowsInput.addEventListener('input', update);
        this.gapInput.addEventListener('input', update);

        // ステッパーボタン
        document.querySelectorAll('#grid-settings .stepper-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target);
                if (!target) return;
                const delta = parseInt(btn.dataset.delta);
                const newVal = Math.max(
                    parseInt(target.min) || 1,
                    Math.min(parseInt(target.max) || 50, parseInt(target.value) + delta)
                );
                target.value = newVal;
                update();
            });
        });

        // クロップリセットボタン
        const resetBtn = document.getElementById('grid-crop-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.cropHandles.reset();
                this._update();
            });
        }
    }

    _update() {
        const gap = parseInt(this.gapInput.value) || 0;
        this.gapValue.textContent = gap + 'px';

        const cols = parseInt(this.colsInput.value) || 1;
        const rows = parseInt(this.rowsInput.value) || 1;
        this.totalEl.textContent = cols * rows;

        const crop = this.cropHandles.getCropRect();
        const cw = crop.w;
        const ch = crop.h;

        if (cw > 0 && ch > 0) {
            const pw = Math.floor((cw - gap * (cols - 1)) / cols);
            const ph = Math.floor((ch - gap * (rows - 1)) / rows);
            this.pieceSizeEl.textContent = `${pw} × ${ph} px`;
        }

        // クロップ情報表示
        if (this.cropInfoEl) {
            const imgSize = this.canvasManager.getImageSize();
            if (this.cropHandles.cropTop > 0 || this.cropHandles.cropBottom > 0 ||
                this.cropHandles.cropLeft > 0 || this.cropHandles.cropRight > 0) {
                this.cropInfoEl.textContent = `クロップ: ${crop.w} × ${crop.h} px (元: ${imgSize.width} × ${imgSize.height})`;
                this.cropInfoEl.style.display = '';
            } else {
                this.cropInfoEl.style.display = 'none';
            }
        }

        this.canvasManager.draw();
    }

    activate() {
        this.canvasManager.setDrawCallback((ctx, w, h, scale) => {
            this._drawGrid(ctx, w, h, scale);
            this.cropHandles.draw(ctx, w, h);
        });
        this.cropHandles.enable();
        this._update();
    }

    deactivate() {
        this.cropHandles.disable();
    }

    _drawGrid(ctx, w, h, scale) {
        const cols = parseInt(this.colsInput.value) || 1;
        const rows = parseInt(this.rowsInput.value) || 1;
        const gap = parseInt(this.gapInput.value) || 0;

        // クロップ範囲内でグリッドを描画
        const left = w * this.cropHandles.cropLeft;
        const top = h * this.cropHandles.cropTop;
        const cropW = w - left - w * this.cropHandles.cropRight;
        const cropH = h - top - h * this.cropHandles.cropBottom;

        const crop = this.cropHandles.getCropRect();
        const cellW = (crop.w - gap * (cols - 1)) / cols;
        const cellH = (crop.h - gap * (rows - 1)) / rows;

        ctx.save();
        ctx.strokeStyle = 'rgba(108, 99, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);

        // 垂直線
        for (let c = 1; c < cols; c++) {
            const x = left + (cellW * c + gap * (c - 1) + gap / 2) * scale;
            ctx.beginPath();
            ctx.moveTo(x, top);
            ctx.lineTo(x, top + cropH);
            ctx.stroke();
        }

        // 水平線
        for (let r = 1; r < rows; r++) {
            const y = top + (cellH * r + gap * (r - 1) + gap / 2) * scale;
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(left + cropW, y);
            ctx.stroke();
        }

        // ギャップ領域をハイライト
        if (gap > 0) {
            ctx.fillStyle = 'rgba(255, 82, 82, 0.15)';
            for (let c = 1; c < cols; c++) {
                const x = left + (cellW * c + gap * (c - 1)) * scale;
                ctx.fillRect(x, top, gap * scale, cropH);
            }
            for (let r = 1; r < rows; r++) {
                const y = top + (cellH * r + gap * (r - 1)) * scale;
                ctx.fillRect(left, y, cropW, gap * scale);
            }
        }

        ctx.restore();

        // セル番号を描画
        ctx.save();
        ctx.font = `bold ${Math.max(12, 14 * scale)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let idx = 1;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cx = left + (cellW * c + gap * c + cellW / 2) * scale;
                const cy = top + (cellH * r + gap * r + cellH / 2) * scale;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.beginPath();
                ctx.arc(cx, cy, 14 * scale, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillText(idx, cx, cy);
                idx++;
            }
        }
        ctx.restore();
    }

    /**
     * 分割領域を取得
     * @returns {Array<{x, y, w, h}>} 画像座標での分割領域
     */
    getRegions() {
        const cols = parseInt(this.colsInput.value) || 1;
        const rows = parseInt(this.rowsInput.value) || 1;
        const gap = parseInt(this.gapInput.value) || 0;

        const crop = this.cropHandles.getCropRect();
        const cellW = (crop.w - gap * (cols - 1)) / cols;
        const cellH = (crop.h - gap * (rows - 1)) / rows;

        const regions = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                regions.push({
                    x: Math.round(crop.x + cellW * c + gap * c),
                    y: Math.round(crop.y + cellH * r + gap * r),
                    w: Math.round(cellW),
                    h: Math.round(cellH)
                });
            }
        }
        return regions;
    }
}
