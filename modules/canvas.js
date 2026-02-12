/**
 * canvas.js - Canvas描画・プレビュー管理
 */

export class CanvasManager {
    constructor() {
        this.canvas = document.getElementById('preview-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container = this.canvas.parentElement;
        this.image = null;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.drawCallback = null;
    }

    setImage(img) {
        this.image = img;
        this._fitToContainer();
        this.draw();
    }

    _fitToContainer() {
        const containerRect = this.container.getBoundingClientRect();
        const cw = containerRect.width - 20; // padding
        const ch = containerRect.height - 20;

        const iw = this.image.naturalWidth;
        const ih = this.image.naturalHeight;

        this.scale = Math.min(cw / iw, ch / ih, 1);

        this.canvas.width = Math.floor(iw * this.scale);
        this.canvas.height = Math.floor(ih * this.scale);
    }

    draw() {
        if (!this.image) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.clearRect(0, 0, w, h);

        // チェッカーボード背景
        this._drawCheckerboard(w, h);

        // 画像描画
        this.ctx.drawImage(this.image, 0, 0, w, h);

        // オーバーレイ描画（モード別コールバック）
        if (this.drawCallback) {
            this.drawCallback(this.ctx, w, h, this.scale);
        }
    }

    _drawCheckerboard(w, h) {
        const size = 10;
        for (let y = 0; y < h; y += size) {
            for (let x = 0; x < w; x += size) {
                this.ctx.fillStyle =
                    (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0
                        ? '#2a2a3a'
                        : '#252535';
                this.ctx.fillRect(x, y, size, size);
            }
        }
    }

    setDrawCallback(cb) {
        this.drawCallback = cb;
    }

    /**
     * キャンバス座標を画像の実座標に変換
     */
    canvasToImageCoords(cx, cy) {
        return {
            x: cx / this.scale,
            y: cy / this.scale
        };
    }

    /**
     * 画像座標をキャンバス座標に変換
     */
    imageToCanvasCoords(ix, iy) {
        return {
            x: ix * this.scale,
            y: iy * this.scale
        };
    }

    getCanvasRect() {
        return this.canvas.getBoundingClientRect();
    }

    getImageSize() {
        if (!this.image) return { width: 0, height: 0 };
        return {
            width: this.image.naturalWidth,
            height: this.image.naturalHeight
        };
    }

    getScale() {
        return this.scale;
    }
}
