/**
 * watermark.js - ウォーターマーク管理・描画ロジック
 */

export class WatermarkManager {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;

        // 状態
        this.state = {
            enabled: false,
            type: 'text', // 'text' | 'image'
            text: 'Sample',
            imageFile: null,
            position: 'center', // top-left, top-center, top-right, middle-left, center, middle-right, bottom-left, bottom-center, bottom-right
            opacity: 0.8,
            scale: 0.1, // 0.01 - 1.0 (Canvasの短辺に対する割合、またはフォントサイズの基準)
            font: 'Arial, sans-serif',
            color: '#FFFFFF',
            margin: 0.02, // 0.0 - 0.2 (Canvasサイズに対する割合)
        };

        this.imageElement = null;
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.canvasManager.draw();
    }

    async loadImage(file) {
        if (!file) return;
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.imageElement = img;
                    this.state.imageFile = file;
                    this.canvasManager.draw();
                    resolve(img);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * ウォーターマークを描画する
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} width Canvas幅
     * @param {number} height Canvas高さ
     */
    render(ctx, width, height) {
        if (!this.state.enabled) return;

        ctx.save();
        ctx.globalAlpha = this.state.opacity;

        const { position, scale, margin, color, text, font } = this.state;
        const minDim = Math.min(width, height);

        let contentW, contentH;
        let drawX, drawY;

        // マージン計算
        const marginPx = minDim * margin;

        if (this.state.type === 'image' && this.imageElement) {
            // 画像モード
            const aspect = this.imageElement.naturalWidth / this.imageElement.naturalHeight;

            // 幅を基準にスケール計算
            contentW = width * scale; // 画面幅に対する割合
            if (contentW > width) contentW = width;
            contentH = contentW / aspect;

        } else {
            // テキストモード
            // フォントサイズは短辺のスケール割合で決定
            const fontSize = Math.max(10, minDim * scale); // 最小10px
            ctx.font = `bold ${fontSize}px ${font}`;
            ctx.textBaseline = 'top';
            const metrics = ctx.measureText(text);
            contentW = metrics.width;
            contentH = fontSize * 1.2; // 行間余裕
        }

        // 位置計算
        // X座標
        if (position.includes('left')) {
            drawX = marginPx;
        } else if (position.includes('right')) {
            drawX = width - contentW - marginPx;
        } else { // center
            drawX = (width - contentW) / 2;
        }

        // Y座標
        if (position.includes('top')) {
            drawY = marginPx;
        } else if (position.includes('bottom')) {
            drawY = height - contentH - marginPx;
        } else { // middle/center
            drawY = (height - contentH) / 2;
        }

        // 描画実行
        if (this.state.type === 'image' && this.imageElement) {
            ctx.drawImage(this.imageElement, drawX, drawY, contentW, contentH);
        } else {
            ctx.fillStyle = color;
            // 影をつけて視認性を上げる
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            ctx.fillText(text, drawX, drawY + (contentH - (minDim * scale)) / 2); // 垂直中央補正
        }

        ctx.restore();
    }
}
