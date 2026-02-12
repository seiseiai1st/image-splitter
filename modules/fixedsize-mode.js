/**
 * fixedsize-mode.js - 固定サイズモード（px指定で分割）
 */

export class FixedSizeMode {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;

        this.widthInput = document.getElementById('fixed-width');
        this.heightInput = document.getElementById('fixed-height');
        this.gapInput = document.getElementById('fixed-gap');
        this.gapValue = document.getElementById('fixed-gap-value');
        this.totalEl = document.getElementById('fixedsize-total');
        this.pieceSizeEl = document.getElementById('fixedsize-piece-size');

        this._bindEvents();
    }

    _bindEvents() {
        const update = () => this._update();
        this.widthInput.addEventListener('input', update);
        this.heightInput.addEventListener('input', update);
        this.gapInput.addEventListener('input', update);
    }

    _update() {
        const gap = parseInt(this.gapInput.value) || 0;
        this.gapValue.textContent = gap + 'px';

        const tileW = parseInt(this.widthInput.value) || 1;
        const tileH = parseInt(this.heightInput.value) || 1;

        this.pieceSizeEl.textContent = `${tileW} x ${tileH} px`;

        const imgSize = this.canvasManager.getImageSize();
        if (imgSize.width > 0) {
            const cols = Math.floor((imgSize.width + gap) / (tileW + gap));
            const rows = Math.floor((imgSize.height + gap) / (tileH + gap));
            this.totalEl.textContent = Math.max(0, cols * rows);
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
        const tileW = parseInt(this.widthInput.value) || 1;
        const tileH = parseInt(this.heightInput.value) || 1;
        const gap = parseInt(this.gapInput.value) || 0;
        const imgSize = this.canvasManager.getImageSize();

        const cols = Math.floor((imgSize.width + gap) / (tileW + gap));
        const rows = Math.floor((imgSize.height + gap) / (tileH + gap));

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 212, 170, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);

        // 垂直線
        for (let c = 1; c <= cols; c++) {
            const x = c * tileW * scale + (c - 1) * gap * scale;
            if (c < cols && gap > 0) {
                ctx.fillStyle = 'rgba(255, 82, 82, 0.15)';
                ctx.fillRect(x, 0, gap * scale, h);
            }
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        // 水平線
        for (let r = 1; r <= rows; r++) {
            const y = r * tileH * scale + (r - 1) * gap * scale;
            if (r < rows && gap > 0) {
                ctx.fillStyle = 'rgba(255, 82, 82, 0.15)';
                ctx.fillRect(0, y, w, gap * scale);
            }
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // 未使用領域をハイライト
        const usedW = cols * tileW + Math.max(0, cols - 1) * gap;
        const usedH = rows * tileH + Math.max(0, rows - 1) * gap;

        if (usedW < imgSize.width) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(usedW * scale, 0, (imgSize.width - usedW) * scale, h);
        }
        if (usedH < imgSize.height) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(0, usedH * scale, w, (imgSize.height - usedH) * scale);
        }

        ctx.restore();

        // セル番号を描画
        ctx.save();
        ctx.font = `bold ${Math.max(10, 12 * scale)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let idx = 1;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cx = (c * (tileW + gap) + tileW / 2) * scale;
                const cy = (r * (tileH + gap) + tileH / 2) * scale;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.beginPath();
                ctx.arc(cx, cy, 12 * scale, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillText(idx, cx, cy);
                idx++;

                if (idx > 999) break; // 安全弁
            }
            if (idx > 999) break;
        }
        ctx.restore();
    }

    /**
     * 分割領域を取得
     */
    getRegions() {
        const tileW = parseInt(this.widthInput.value) || 1;
        const tileH = parseInt(this.heightInput.value) || 1;
        const gap = parseInt(this.gapInput.value) || 0;
        const imgSize = this.canvasManager.getImageSize();

        const cols = Math.floor((imgSize.width + gap) / (tileW + gap));
        const rows = Math.floor((imgSize.height + gap) / (tileH + gap));

        const regions = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                regions.push({
                    x: c * (tileW + gap),
                    y: r * (tileH + gap),
                    w: tileW,
                    h: tileH
                });
            }
        }
        return regions;
    }
}
