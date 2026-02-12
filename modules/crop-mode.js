/**
 * crop-mode.js - トリミングモード（自由なクロップ枠を追加）
 */

export class CropMode {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.cropBoxes = []; // { id, x, y, w, h } - 画像座標
        this.cropOverlay = document.getElementById('crop-overlay');
        this.cropList = document.getElementById('crop-list');
        this.cropTotal = document.getElementById('crop-total');

        this.isDrawing = false;
        this.isDragging = false;
        this.isResizing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentBox = null;
        this.dragOffset = { x: 0, y: 0 };
        this.resizeHandle = '';

        this._onOverlayMouseDown = this._onOverlayMouseDown.bind(this);
        this._onOverlayMouseMove = this._onOverlayMouseMove.bind(this);
        this._onOverlayMouseUp = this._onOverlayMouseUp.bind(this);
    }

    activate() {
        this.cropOverlay.classList.remove('hidden');
        this._syncOverlaySize();

        this.canvasManager.setDrawCallback((ctx, w, h, scale) => {
            this._drawCropBoxesOnCanvas(ctx, w, h, scale);
        });

        this.cropOverlay.addEventListener('mousedown', this._onOverlayMouseDown);
        document.addEventListener('mousemove', this._onOverlayMouseMove);
        document.addEventListener('mouseup', this._onOverlayMouseUp);

        this._updateUI();
        this.canvasManager.draw();
    }

    deactivate() {
        this.cropOverlay.classList.add('hidden');
        this.cropOverlay.removeEventListener('mousedown', this._onOverlayMouseDown);
        document.removeEventListener('mousemove', this._onOverlayMouseMove);
        document.removeEventListener('mouseup', this._onOverlayMouseUp);
    }

    _syncOverlaySize() {
        const canvas = this.canvasManager.canvas;
        const rect = canvas.getBoundingClientRect();
        const container = this.canvasManager.container.getBoundingClientRect();

        this.cropOverlay.style.left = (rect.left - container.left) + 'px';
        this.cropOverlay.style.top = (rect.top - container.top) + 'px';
        this.cropOverlay.style.width = rect.width + 'px';
        this.cropOverlay.style.height = rect.height + 'px';
    }

    _onOverlayMouseDown(e) {
        if (e.target.classList.contains('crop-delete')) return;

        const rect = this.cropOverlay.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // リサイズハンドルのチェック
        const resizeTarget = e.target.closest('.resize-handle');
        if (resizeTarget) {
            const box = e.target.closest('.crop-box');
            if (box) {
                this.isResizing = true;
                this.currentBox = this.cropBoxes.find(b => b.id === parseInt(box.dataset.id));
                this.resizeHandle = resizeTarget.classList.contains('nw') ? 'nw'
                    : resizeTarget.classList.contains('ne') ? 'ne'
                        : resizeTarget.classList.contains('sw') ? 'sw' : 'se';
                this.startX = mx;
                this.startY = my;
                e.preventDefault();
                return;
            }
        }

        // 既存ボックスのドラッグチェック
        const boxEl = e.target.closest('.crop-box');
        if (boxEl && !e.target.classList.contains('crop-delete')) {
            this.isDragging = true;
            this.currentBox = this.cropBoxes.find(b => b.id === parseInt(boxEl.dataset.id));
            const scale = this.canvasManager.getScale();
            this.dragOffset = {
                x: mx - this.currentBox.x * scale,
                y: my - this.currentBox.y * scale
            };
            e.preventDefault();
            return;
        }

        // 新しいボックスの描画開始
        this.isDrawing = true;
        this.startX = mx;
        this.startY = my;
        e.preventDefault();
    }

    _onOverlayMouseMove(e) {
        const rect = this.cropOverlay.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const scale = this.canvasManager.getScale();
        const imgSize = this.canvasManager.getImageSize();

        if (this.isDrawing) {
            // 一時的なボックスを描画
            const x = Math.min(this.startX, mx);
            const y = Math.min(this.startY, my);
            const w = Math.abs(mx - this.startX);
            const h = Math.abs(my - this.startY);

            // 一時的なプレビュー用div
            let tempBox = this.cropOverlay.querySelector('.temp-crop-box');
            if (!tempBox) {
                tempBox = document.createElement('div');
                tempBox.className = 'crop-box temp-crop-box';
                this.cropOverlay.appendChild(tempBox);
            }
            tempBox.style.left = x + 'px';
            tempBox.style.top = y + 'px';
            tempBox.style.width = w + 'px';
            tempBox.style.height = h + 'px';
        } else if (this.isDragging && this.currentBox) {
            let newX = (mx - this.dragOffset.x) / scale;
            let newY = (my - this.dragOffset.y) / scale;

            // 範囲制限
            newX = Math.max(0, Math.min(imgSize.width - this.currentBox.w, newX));
            newY = Math.max(0, Math.min(imgSize.height - this.currentBox.h, newY));

            this.currentBox.x = newX;
            this.currentBox.y = newY;
            this._renderCropBoxes();
            this.canvasManager.draw();
            this._updateUI();
        } else if (this.isResizing && this.currentBox) {
            const dx = (mx - this.startX) / scale;
            const dy = (my - this.startY) / scale;

            const box = this.currentBox;
            const origX = box.x, origY = box.y, origW = box.w, origH = box.h;

            if (this.resizeHandle.includes('e')) {
                box.w = Math.max(10, origW + dx);
            }
            if (this.resizeHandle.includes('s')) {
                box.h = Math.max(10, origH + dy);
            }
            if (this.resizeHandle.includes('w')) {
                const newW = Math.max(10, origW - dx);
                box.x = origX + (origW - newW);
                box.w = newW;
            }
            if (this.resizeHandle.includes('n')) {
                const newH = Math.max(10, origH - dy);
                box.y = origY + (origH - newH);
                box.h = newH;
            }

            // Clamp
            box.x = Math.max(0, box.x);
            box.y = Math.max(0, box.y);
            box.w = Math.min(imgSize.width - box.x, box.w);
            box.h = Math.min(imgSize.height - box.y, box.h);

            this.startX = mx;
            this.startY = my;
            this._renderCropBoxes();
            this.canvasManager.draw();
            this._updateUI();
        }
    }

    _onOverlayMouseUp(e) {
        if (this.isDrawing) {
            const rect = this.cropOverlay.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const scale = this.canvasManager.getScale();

            const x = Math.min(this.startX, mx) / scale;
            const y = Math.min(this.startY, my) / scale;
            const w = Math.abs(mx - this.startX) / scale;
            const h = Math.abs(my - this.startY) / scale;

            // 一時ボックスを削除
            const tempBox = this.cropOverlay.querySelector('.temp-crop-box');
            if (tempBox) tempBox.remove();

            // 最小サイズチェック
            if (w > 5 && h > 5) {
                this.cropBoxes.push({
                    id: Date.now(),
                    x: Math.round(x),
                    y: Math.round(y),
                    w: Math.round(w),
                    h: Math.round(h)
                });
                this._renderCropBoxes();
                this.canvasManager.draw();
                this._updateUI();
            }
        }

        this.isDrawing = false;
        this.isDragging = false;
        this.isResizing = false;
        this.currentBox = null;
    }

    _renderCropBoxes() {
        // 既存のボックス要素をクリア(一時的なものを除く)
        this.cropOverlay.querySelectorAll('.crop-box:not(.temp-crop-box)').forEach(el => el.remove());

        const scale = this.canvasManager.getScale();

        this.cropBoxes.forEach((box, idx) => {
            const el = document.createElement('div');
            el.className = 'crop-box';
            el.dataset.id = box.id;
            el.style.left = (box.x * scale) + 'px';
            el.style.top = (box.y * scale) + 'px';
            el.style.width = (box.w * scale) + 'px';
            el.style.height = (box.h * scale) + 'px';

            // 削除ボタン
            const delBtn = document.createElement('button');
            delBtn.className = 'crop-delete';
            delBtn.textContent = '✕';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._removeBox(box.id);
            });
            el.appendChild(delBtn);

            // ラベル
            const label = document.createElement('div');
            label.className = 'crop-label';
            label.textContent = `#${idx + 1}: ${Math.round(box.w)}×${Math.round(box.h)}px`;
            el.appendChild(label);

            // リサイズハンドル
            ['nw', 'ne', 'sw', 'se'].forEach(corner => {
                const handle = document.createElement('div');
                handle.className = `resize-handle ${corner}`;
                el.appendChild(handle);
            });

            this.cropOverlay.appendChild(el);
        });
    }

    _removeBox(id) {
        this.cropBoxes = this.cropBoxes.filter(b => b.id !== id);
        this._renderCropBoxes();
        this.canvasManager.draw();
        this._updateUI();
    }

    _updateUI() {
        this.cropTotal.textContent = this.cropBoxes.length;

        if (this.cropBoxes.length === 0) {
            this.cropList.innerHTML = '<p class="empty-hint">クロップ枠がまだありません。画像上でドラッグして追加してください。</p>';
            return;
        }

        this.cropList.innerHTML = this.cropBoxes
            .map((box, idx) => `
        <div class="crop-item">
          <span>#${idx + 1}: ${Math.round(box.w)} × ${Math.round(box.h)} px</span>
          <button class="delete-crop" data-id="${box.id}" title="削除">✕</button>
        </div>
      `)
            .join('');

        this.cropList.querySelectorAll('.delete-crop').forEach(btn => {
            btn.addEventListener('click', () => {
                this._removeBox(parseInt(btn.dataset.id));
            });
        });
    }

    _drawCropBoxesOnCanvas(ctx, w, h, scale) {
        // Canvas上にもクロップ枠を描画（見やすくするため）
        ctx.save();
        // 暗くする（選択外部分）
        if (this.cropBoxes.length > 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, w, h);

            // 各ボックスの領域を明るく
            ctx.globalCompositeOperation = 'destination-out';
            this.cropBoxes.forEach(box => {
                ctx.fillStyle = 'rgba(0, 0, 0, 1)';
                ctx.fillRect(box.x * scale, box.y * scale, box.w * scale, box.h * scale);
            });

            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();
    }

    /**
     * 分割領域を取得
     */
    getRegions() {
        return this.cropBoxes.map(box => ({
            x: Math.round(box.x),
            y: Math.round(box.y),
            w: Math.round(box.w),
            h: Math.round(box.h)
        }));
    }
}
