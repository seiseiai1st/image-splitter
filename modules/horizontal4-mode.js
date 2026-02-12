/**
 * horizontal4-mode.js - 水平4分割モード（画像を横方向に4等分）
 */

export class Horizontal4Mode {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.pieceSizeEl = document.getElementById('h4-piece-size');
    }

    activate() {
        this.canvasManager.setDrawCallback((ctx, w, h, scale) => {
            this._drawLines(ctx, w, h, scale);
        });
        this._updateInfo();
    }

    deactivate() {
        // noop
    }

    _updateInfo() {
        const imgSize = this.canvasManager.getImageSize();
        if (imgSize.width > 0) {
            const pieceW = Math.floor(imgSize.width / 4);
            this.pieceSizeEl.textContent = `${pieceW} × ${imgSize.height} px`;
        }
        this.canvasManager.draw();
    }

    _drawLines(ctx, w, h, scale) {
        const imgSize = this.canvasManager.getImageSize();
        const pieceW = imgSize.width / 4;

        ctx.save();

        // 分割線を描画
        ctx.strokeStyle = 'rgba(0, 212, 170, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);

        for (let i = 1; i < 4; i++) {
            const x = pieceW * i * scale;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        ctx.restore();

        // セル番号を描画
        ctx.save();
        ctx.font = `bold ${Math.max(14, 18 * scale)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < 4; i++) {
            const cx = (pieceW * i + pieceW / 2) * scale;
            const cy = h / 2;

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
        const imgSize = this.canvasManager.getImageSize();
        const pieceW = imgSize.width / 4;

        const regions = [];
        for (let i = 0; i < 4; i++) {
            regions.push({
                x: Math.round(pieceW * i),
                y: 0,
                w: Math.round(pieceW),
                h: imgSize.height
            });
        }
        return regions;
    }
}
