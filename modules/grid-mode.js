/**
 * grid-mode.js - グリッドモード（行×列で均等分割）
 */

export class GridMode {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;

        this.colsInput = document.getElementById('grid-cols');
        this.rowsInput = document.getElementById('grid-rows');
        this.gapInput = document.getElementById('grid-gap');
        this.gapValue = document.getElementById('grid-gap-value');
        this.totalEl = document.getElementById('grid-total');
        this.pieceSizeEl = document.getElementById('grid-piece-size');

        this._bindEvents();
    }

    _bindEvents() {
        const update = () => this._update();

        this.colsInput.addEventListener('input', update);
        this.rowsInput.addEventListener('input', update);
        this.gapInput.addEventListener('input', update);

        // ステッパーボタン
        document.querySelectorAll('.stepper-btn').forEach(btn => {
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
    }

    _update() {
        const gap = parseInt(this.gapInput.value) || 0;
        this.gapValue.textContent = gap + 'px';

        const cols = parseInt(this.colsInput.value) || 1;
        const rows = parseInt(this.rowsInput.value) || 1;
        this.totalEl.textContent = cols * rows;

        const imgSize = this.canvasManager.getImageSize();
        if (imgSize.width > 0) {
            const pw = Math.floor((imgSize.width - gap * (cols - 1)) / cols);
            const ph = Math.floor((imgSize.height - gap * (rows - 1)) / rows);
            this.pieceSizeEl.textContent = `${pw} x ${ph} px`;
        }

        this.canvasManager.draw();
    }

    activate() {
        this.canvasManager.setDrawCallback((ctx, w, h, scale) => {
            this._drawGrid(ctx, w, h, scale);
        });
        this._update();
    }

    deactivate() {
        // noop
    }

    _drawGrid(ctx, w, h, scale) {
        const cols = parseInt(this.colsInput.value) || 1;
        const rows = parseInt(this.rowsInput.value) || 1;
        const gap = parseInt(this.gapInput.value) || 0;

        const imgSize = this.canvasManager.getImageSize();
        const cellW = (imgSize.width - gap * (cols - 1)) / cols;
        const cellH = (imgSize.height - gap * (rows - 1)) / rows;

        ctx.save();
        ctx.strokeStyle = 'rgba(108, 99, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);

        // 垂直線
        for (let c = 1; c < cols; c++) {
            const x = (cellW * c + gap * (c - 1) + gap / 2) * scale;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        // 水平線
        for (let r = 1; r < rows; r++) {
            const y = (cellH * r + gap * (r - 1) + gap / 2) * scale;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // ギャップ領域をハイライト
        if (gap > 0) {
            ctx.fillStyle = 'rgba(255, 82, 82, 0.15)';
            for (let c = 1; c < cols; c++) {
                const x = (cellW * c + gap * (c - 1)) * scale;
                ctx.fillRect(x, 0, gap * scale, h);
            }
            for (let r = 1; r < rows; r++) {
                const y = (cellH * r + gap * (r - 1)) * scale;
                ctx.fillRect(0, y, w, gap * scale);
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
                const cx = (cellW * c + gap * c + cellW / 2) * scale;
                const cy = (cellH * r + gap * r + cellH / 2) * scale;

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

        const imgSize = this.canvasManager.getImageSize();
        const cellW = (imgSize.width - gap * (cols - 1)) / cols;
        const cellH = (imgSize.height - gap * (rows - 1)) / rows;

        const regions = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                regions.push({
                    x: Math.round(cellW * c + gap * c),
                    y: Math.round(cellH * r + gap * r),
                    w: Math.round(cellW),
                    h: Math.round(cellH)
                });
            }
        }
        return regions;
    }
}
