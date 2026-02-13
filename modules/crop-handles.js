/**
 * crop-handles.js - ドラッグ可能なクロップハンドル
 * キャンバス上で画像の上下左右をドラッグしてクロップ範囲を変更
 */

export class CropHandles {
    /**
     * @param {import('./canvas.js').CanvasManager} canvasManager
     * @param {Function} onCropChange - クロップ変更時のコールバック
     */
    constructor(canvasManager, onCropChange) {
        this.canvasManager = canvasManager;
        this.onCropChange = onCropChange;
        this.canvas = canvasManager.canvas;

        // クロップ領域（画像座標、0〜1の比率で管理）
        this.cropTop = 0;
        this.cropBottom = 0;
        this.cropLeft = 0;
        this.cropRight = 0;

        // ドラッグ状態
        this.dragging = null; // 'top' | 'bottom' | 'left' | 'right' | null
        this.handleSize = 8; // ハンドルの当たり判定ピクセル

        // バインド済みイベントハンドラ
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);

        this.active = false;
    }

    /** ハンドルを有効化 */
    enable() {
        if (this.active) return;
        this.active = true;
        this.canvas.addEventListener('mousedown', this._onMouseDown);
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mouseup', this._onMouseUp);
        this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
        window.addEventListener('touchmove', this._onTouchMove, { passive: false });
        window.addEventListener('touchend', this._onTouchEnd);
    }

    /** ハンドルを無効化 */
    disable() {
        if (!this.active) return;
        this.active = false;
        this.dragging = null;
        this.canvas.style.cursor = '';
        this.canvas.removeEventListener('mousedown', this._onMouseDown);
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('mouseup', this._onMouseUp);
        this.canvas.removeEventListener('touchstart', this._onTouchStart);
        window.removeEventListener('touchmove', this._onTouchMove);
        window.removeEventListener('touchend', this._onTouchEnd);
    }

    /** クロップをリセット */
    reset() {
        this.cropTop = 0;
        this.cropBottom = 0;
        this.cropLeft = 0;
        this.cropRight = 0;
    }

    /**
     * クロップ領域を画像座標で取得
     * @returns {{ x: number, y: number, w: number, h: number }}
     */
    getCropRect() {
        const imgSize = this.canvasManager.getImageSize();
        const x = Math.round(imgSize.width * this.cropLeft);
        const y = Math.round(imgSize.height * this.cropTop);
        const w = Math.round(imgSize.width * (1 - this.cropLeft - this.cropRight));
        const h = Math.round(imgSize.height * (1 - this.cropTop - this.cropBottom));
        return { x, y, w, h };
    }

    /**
     * キャンバス描画コールバック内で呼び出す
     * クロップ外のオーバーレイとハンドルを描画
     */
    draw(ctx, canvasW, canvasH) {
        if (!this.active) return;

        const left = canvasW * this.cropLeft;
        const right = canvasW * this.cropRight;
        const top = canvasH * this.cropTop;
        const bottom = canvasH * this.cropBottom;
        const cropW = canvasW - left - right;
        const cropH = canvasH - top - bottom;

        // クロップ外を半透明でマスク
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';

        // 上
        if (top > 0) ctx.fillRect(0, 0, canvasW, top);
        // 下
        if (bottom > 0) ctx.fillRect(0, canvasH - bottom, canvasW, bottom);
        // 左
        if (left > 0) ctx.fillRect(0, top, left, cropH);
        // 右
        if (right > 0) ctx.fillRect(canvasW - right, top, right, cropH);

        // クロップ枠線
        ctx.strokeStyle = 'rgba(255, 200, 0, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(left, top, cropW, cropH);

        // 四辺のハンドルバー
        const handleLen = 40;
        const handleThick = 5;
        ctx.fillStyle = 'rgba(255, 200, 0, 1)';

        // 上辺ハンドル
        const topBarX = left + cropW / 2 - handleLen / 2;
        ctx.fillRect(topBarX, top - handleThick / 2, handleLen, handleThick);
        this._drawArrow(ctx, left + cropW / 2, top - 12, 'up');

        // 下辺ハンドル
        const bottomBarX = left + cropW / 2 - handleLen / 2;
        ctx.fillRect(bottomBarX, canvasH - bottom - handleThick / 2, handleLen, handleThick);
        this._drawArrow(ctx, left + cropW / 2, canvasH - bottom + 12, 'down');

        // 左辺ハンドル
        const leftBarY = top + cropH / 2 - handleLen / 2;
        ctx.fillRect(left - handleThick / 2, leftBarY, handleThick, handleLen);
        this._drawArrow(ctx, left - 12, top + cropH / 2, 'left');

        // 右辺ハンドル
        const rightBarY = top + cropH / 2 - handleLen / 2;
        ctx.fillRect(canvasW - right - handleThick / 2, rightBarY, handleThick, handleLen);
        this._drawArrow(ctx, canvasW - right + 12, top + cropH / 2, 'right');

        ctx.restore();

        // クロップサイズ表示
        const crop = this.getCropRect();
        if (this.cropTop > 0 || this.cropBottom > 0 || this.cropLeft > 0 || this.cropRight > 0) {
            ctx.save();
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(255, 200, 0, 0.9)';
            ctx.fillText(`${crop.w} × ${crop.h} px`, left + cropW / 2, top + 6);
            ctx.restore();
        }
    }

    /** 矢印描画 */
    _drawArrow(ctx, x, y, direction) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
        ctx.beginPath();
        const s = 5;
        switch (direction) {
            case 'up':
                ctx.moveTo(x - s, y + s);
                ctx.lineTo(x, y - s);
                ctx.lineTo(x + s, y + s);
                break;
            case 'down':
                ctx.moveTo(x - s, y - s);
                ctx.lineTo(x, y + s);
                ctx.lineTo(x + s, y - s);
                break;
            case 'left':
                ctx.moveTo(x + s, y - s);
                ctx.lineTo(x - s, y);
                ctx.lineTo(x + s, y + s);
                break;
            case 'right':
                ctx.moveTo(x - s, y - s);
                ctx.lineTo(x + s, y);
                ctx.lineTo(x - s, y + s);
                break;
        }
        ctx.fill();
        ctx.restore();
    }

    // ===== マウスイベント =====

    _getCanvasPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    _hitTest(pos) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const left = w * this.cropLeft;
        const right = w * this.cropRight;
        const top = h * this.cropTop;
        const bottom = h * this.cropBottom;
        const hs = this.handleSize;

        // 上辺
        if (Math.abs(pos.y - top) < hs && pos.x >= left && pos.x <= w - right) return 'top';
        // 下辺
        if (Math.abs(pos.y - (h - bottom)) < hs && pos.x >= left && pos.x <= w - right) return 'bottom';
        // 左辺
        if (Math.abs(pos.x - left) < hs && pos.y >= top && pos.y <= h - bottom) return 'left';
        // 右辺
        if (Math.abs(pos.x - (w - right)) < hs && pos.y >= top && pos.y <= h - bottom) return 'right';

        return null;
    }

    _onMouseDown(e) {
        const pos = this._getCanvasPos(e);
        const hit = this._hitTest(pos);
        if (hit) {
            this.dragging = hit;
            e.preventDefault();
        }
    }

    _onMouseMove(e) {
        const pos = this._getCanvasPos(e);

        if (this.dragging) {
            this._applyDrag(pos);
            e.preventDefault();
        } else {
            // カーソル変更
            const hit = this._hitTest(pos);
            if (hit === 'top' || hit === 'bottom') {
                this.canvas.style.cursor = 'ns-resize';
            } else if (hit === 'left' || hit === 'right') {
                this.canvas.style.cursor = 'ew-resize';
            } else {
                this.canvas.style.cursor = '';
            }
        }
    }

    _onMouseUp() {
        this.dragging = null;
    }

    // ===== タッチイベント =====

    _onTouchStart(e) {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        const pos = this._getCanvasPos(touch);
        const hit = this._hitTest(pos);
        if (hit) {
            this.dragging = hit;
            e.preventDefault();
        }
    }

    _onTouchMove(e) {
        if (!this.dragging || e.touches.length !== 1) return;
        const touch = e.touches[0];
        const pos = this._getCanvasPos(touch);
        this._applyDrag(pos);
        e.preventDefault();
    }

    _onTouchEnd() {
        this.dragging = null;
    }

    // ===== ドラッグ適用 =====

    _applyDrag(pos) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const minSize = 0.05; // 最小5%

        switch (this.dragging) {
            case 'top': {
                let ratio = Math.max(0, Math.min(pos.y / h, 1 - this.cropBottom - minSize));
                this.cropTop = ratio;
                break;
            }
            case 'bottom': {
                let ratio = Math.max(0, Math.min((h - pos.y) / h, 1 - this.cropTop - minSize));
                this.cropBottom = ratio;
                break;
            }
            case 'left': {
                let ratio = Math.max(0, Math.min(pos.x / w, 1 - this.cropRight - minSize));
                this.cropLeft = ratio;
                break;
            }
            case 'right': {
                let ratio = Math.max(0, Math.min((w - pos.x) / w, 1 - this.cropLeft - minSize));
                this.cropRight = ratio;
                break;
            }
        }

        this.canvasManager.draw();
        if (this.onCropChange) {
            this.onCropChange(this.getCropRect());
        }
    }
}
