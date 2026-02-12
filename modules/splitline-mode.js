/**
 * splitline-mode.js - 分割線モード（水平・垂直線をドラッグで追加・調整）
 */

export class SplitlineMode {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.lines = []; // { type: 'h'|'v', position: 0-1 (ratio) }

        this.addHLineBtn = document.getElementById('add-hline');
        this.addVLineBtn = document.getElementById('add-vline');
        this.lineList = document.getElementById('splitline-list');
        this.totalEl = document.getElementById('splitline-total');

        this.dragging = null;
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);

        this._bindEvents();
    }

    _bindEvents() {
        this.addHLineBtn.addEventListener('click', () => {
            this._addLine('h');
        });

        this.addVLineBtn.addEventListener('click', () => {
            this._addLine('v');
        });
    }

    _addLine(type) {
        // 新しい線を既存線の間に配置
        const existing = this.lines
            .filter(l => l.type === type)
            .map(l => l.position)
            .sort((a, b) => a - b);

        let pos;
        if (existing.length === 0) {
            pos = 0.5;
        } else {
            // 最大の間隔を見つけてそこに追加
            const points = [0, ...existing, 1];
            let maxGap = 0;
            let maxGapIdx = 0;
            for (let i = 1; i < points.length; i++) {
                const gap = points[i] - points[i - 1];
                if (gap > maxGap) {
                    maxGap = gap;
                    maxGapIdx = i;
                }
            }
            pos = (points[maxGapIdx - 1] + points[maxGapIdx]) / 2;
        }

        this.lines.push({ type, position: pos, id: Date.now() });
        this._updateUI();
        this.canvasManager.draw();
    }

    _removeLine(id) {
        this.lines = this.lines.filter(l => l.id !== id);
        this._updateUI();
        this.canvasManager.draw();
    }

    _updateUI() {
        const hCount = this.lines.filter(l => l.type === 'h').length;
        const vCount = this.lines.filter(l => l.type === 'v').length;
        this.totalEl.textContent = (hCount + 1) * (vCount + 1);

        if (this.lines.length === 0) {
            this.lineList.innerHTML = '<p class="empty-hint">分割線がまだありません。上のボタンで追加してください。</p>';
            return;
        }

        this.lineList.innerHTML = this.lines
            .map((line, idx) => {
                const typeLabel = line.type === 'h' ? '水平' : '垂直';
                const typeClass = line.type === 'h' ? 'horizontal' : 'vertical';
                const imgSize = this.canvasManager.getImageSize();
                const px = line.type === 'h'
                    ? Math.round(line.position * imgSize.height)
                    : Math.round(line.position * imgSize.width);
                return `
          <div class="line-item" data-id="${line.id}">
            <div class="line-type">
              <span class="line-type-badge ${typeClass}">${typeLabel}</span>
              <span>${px}px</span>
            </div>
            <button class="delete-line" data-id="${line.id}" title="削除">✕</button>
          </div>
        `;
            })
            .join('');

        // 削除ボタンにイベント
        this.lineList.querySelectorAll('.delete-line').forEach(btn => {
            btn.addEventListener('click', () => {
                this._removeLine(parseInt(btn.dataset.id));
            });
        });
    }

    activate() {
        this.canvasManager.setDrawCallback((ctx, w, h, scale) => {
            this._drawLines(ctx, w, h, scale);
        });
        this._updateUI();
        this.canvasManager.draw();

        // ドラッグイベントをキャンバスに追加
        const canvas = this.canvasManager.canvas;
        canvas.addEventListener('mousedown', this._onCanvasMouseDown.bind(this));
    }

    deactivate() {
        const canvas = this.canvasManager.canvas;
        canvas.removeEventListener('mousedown', this._onCanvasMouseDown);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('mouseup', this._onMouseUp);
    }

    _onCanvasMouseDown = (e) => {
        const rect = this.canvasManager.getCanvasRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const w = rect.width;
        const h = rect.height;

        // 近くの線を見つける
        const threshold = 8;
        for (const line of this.lines) {
            if (line.type === 'h') {
                const lineY = line.position * h;
                if (Math.abs(y - lineY) < threshold) {
                    this.dragging = line;
                    document.addEventListener('mousemove', this._onMouseMove);
                    document.addEventListener('mouseup', this._onMouseUp);
                    return;
                }
            } else {
                const lineX = line.position * w;
                if (Math.abs(x - lineX) < threshold) {
                    this.dragging = line;
                    document.addEventListener('mousemove', this._onMouseMove);
                    document.addEventListener('mouseup', this._onMouseUp);
                    return;
                }
            }
        }
    }

    _onMouseMove(e) {
        if (!this.dragging) return;

        const rect = this.canvasManager.getCanvasRect();
        if (this.dragging.type === 'h') {
            const y = e.clientY - rect.top;
            this.dragging.position = Math.max(0.01, Math.min(0.99, y / rect.height));
        } else {
            const x = e.clientX - rect.left;
            this.dragging.position = Math.max(0.01, Math.min(0.99, x / rect.width));
        }

        this._updateUI();
        this.canvasManager.draw();
    }

    _onMouseUp() {
        this.dragging = null;
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('mouseup', this._onMouseUp);
    }

    _drawLines(ctx, w, h, scale) {
        ctx.save();

        for (const line of this.lines) {
            if (line.type === 'h') {
                const y = line.position * h;
                ctx.strokeStyle = 'rgba(108, 99, 255, 0.9)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 4]);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();

                // ハンドル
                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(108, 99, 255, 0.8)';
                this._drawPill(ctx, 6, y, 28, 14);
                ctx.fillStyle = 'white';
                ctx.font = '10px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⇕', 20, y);
            } else {
                const x = line.position * w;
                ctx.strokeStyle = 'rgba(0, 212, 170, 0.9)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 4]);
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();

                // ハンドル
                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(0, 212, 170, 0.8)';
                this._drawPill(ctx, x - 14, 6, 28, 14);
                ctx.fillStyle = 'white';
                ctx.font = '10px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⇔', x, 13);
            }
        }

        ctx.restore();
    }

    _drawPill(ctx, x, y, w, h) {
        const r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y - h / 2);
        ctx.lineTo(x + w - r, y - h / 2);
        ctx.arcTo(x + w, y - h / 2, x + w, y, r);
        ctx.arcTo(x + w, y + h / 2, x + w - r, y + h / 2, r);
        ctx.lineTo(x + r, y + h / 2);
        ctx.arcTo(x, y + h / 2, x, y, r);
        ctx.arcTo(x, y - h / 2, x + r, y - h / 2, r);
        ctx.fill();
    }

    /**
     * 分割領域を取得
     */
    getRegions() {
        const imgSize = this.canvasManager.getImageSize();
        const hPositions = [0, ...this.lines.filter(l => l.type === 'h').map(l => l.position).sort((a, b) => a - b), 1];
        const vPositions = [0, ...this.lines.filter(l => l.type === 'v').map(l => l.position).sort((a, b) => a - b), 1];

        const regions = [];
        for (let r = 0; r < hPositions.length - 1; r++) {
            for (let c = 0; c < vPositions.length - 1; c++) {
                const x = Math.round(vPositions[c] * imgSize.width);
                const y = Math.round(hPositions[r] * imgSize.height);
                const w = Math.round((vPositions[c + 1] - vPositions[c]) * imgSize.width);
                const h = Math.round((hPositions[r + 1] - hPositions[r]) * imgSize.height);
                regions.push({ x, y, w, h });
            }
        }
        return regions;
    }
}
