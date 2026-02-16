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
        if (this.state.type === 'image' && this.imageElement) {
            // 画像モード: globalAlpha を使用
            ctx.globalAlpha = this.state.opacity;

            const aspect = this.imageElement.naturalWidth / this.imageElement.naturalHeight;

            // 幅を基準にスケール計算
            contentW = width * scale; // 画面幅に対する割合
            if (contentW > width) contentW = width;
            contentH = contentW / aspect;

        } else {
            // テキストモード: fillStyle / shadowColor で透明度を指定 (モバイル対策)
            // globalAlpha は 1.0 のまま維持

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
            // 色と透明度の変換
            const rgb = this._hexToRgb(color);
            const opacity = this.state.opacity;

            if (rgb) {
                ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
            } else {
                // フォールバック (念のため)
                ctx.globalAlpha = opacity;
                ctx.fillStyle = color;
            }

            // 影をつけて視認性を上げる (影も透明度連動)
            const shadowOpacity = Math.max(0, opacity * 0.5); // 半分の不透明度
            ctx.shadowColor = `rgba(0,0,0,${shadowOpacity})`;
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            ctx.fillText(text, drawX, drawY + (contentH - (minDim * scale)) / 2); // 垂直中央補正
        }
        ctx.restore();
    }

    /**
     * HEXカラーをRBGオブジェクトに変換
     * @param {string} hex "#RRGGBB"
     * @returns {Object|null} {r, g, b}
     */
    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}
