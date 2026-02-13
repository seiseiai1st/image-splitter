/**
 * horizontal4-mode.js - 垂直4分割モード（画像を縦方向に4等分）
 * クロップハンドル対応
 */

import { CropHandles } from './crop-handles.js';

export class Horizontal4Mode {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.pieceSizeEl = document.getElementById('h4-piece-size');
        this.cropInfoEl = document.getElementById('h4-crop-info');

        // クロップハンドル
        this.cropHandles = new CropHandles(canvasManager, (cropRect) => {
            this._updateInfo();
        });

        // クロップリセットボタン
        const resetBtn = document.getElementById('h4-crop-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.cropHandles.reset();
                this._updateInfo();
            });
        }
    }

    activate() {
        this.canvasManager.setDrawCallback((ctx, w, h, scale) => {
            this._drawLines(ctx, w, h, scale);
            this.cropHandles.draw(ctx, w, h);
        });
        this.cropHandles.enable();
        this._updateInfo();
    }

    deactivate() {
        this.cropHandles.disable();
    }

    _updateInfo() {
        const crop = this.cropHandles.getCropRect();
        if (crop.w > 0 && crop.h > 0) {
            const pieceH = Math.floor(crop.h / 4);
            this.pieceSizeEl.textContent = `${crop.w} × ${pieceH} px`;
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

    _drawLines(ctx, w, h, scale) {
        // クロップ範囲内で分割線を描画
        const left = w * this.cropHandles.cropLeft;
        const top = h * this.cropHandles.cropTop;
        const cropW = w - left - w * this.cropHandles.cropRight;
        const cropH = h - top - h * this.cropHandles.cropBottom;

        const pieceH = cropH / 4;

        ctx.save();

        // 水平分割線を描画
        ctx.strokeStyle = 'rgba(0, 212, 170, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);

        for (let i = 1; i < 4; i++) {
            const y = top + pieceH * i;
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(left + cropW, y);
            ctx.stroke();
        }

        ctx.restore();

        // セル番号を描画
        ctx.save();
        ctx.font = `bold ${Math.max(14, 18 * scale)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < 4; i++) {
            const cx = left + cropW / 2;
            const cy = top + pieceH * i + pieceH / 2;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(cx, cy, 16 * scale, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(i + 1, cx, cy);
        }
        ctx.restore();
    }

    /**
     * 分割領域を取得
     * @returns {Array<{x, y, w, h}>} 画像座標での分割領域
     */
    getRegions() {
        const crop = this.cropHandles.getCropRect();
        const pieceH = crop.h / 4;

        const regions = [];
        for (let i = 0; i < 4; i++) {
            regions.push({
                x: crop.x,
                y: Math.round(crop.y + pieceH * i),
                w: crop.w,
                h: Math.round(pieceH)
            });
        }
        return regions;
    }
}
