/**
 * main.js - エントリーポイント。全モジュールの初期化とモード切替管理。
 */

import './style.css';
import { ImageUploader } from './modules/uploader.js';
import { CanvasManager } from './modules/canvas.js';
import { GridMode } from './modules/grid-mode.js';
import { SplitlineMode } from './modules/splitline-mode.js';
import { CropMode } from './modules/crop-mode.js';
import { FixedSizeMode } from './modules/fixedsize-mode.js';
import { Horizontal4Mode } from './modules/horizontal4-mode.js';
import { Exporter } from './modules/exporter.js';

// ===== 状態 =====
let currentMode = 'grid';
let imageLoaded = false;

// ===== DOM要素 =====
const uploadArea = document.getElementById('upload-area');
const editorArea = document.getElementById('editor-area');
const imageNameEl = document.getElementById('image-name');
const imageSizeEl = document.getElementById('image-size');
const imageFilesizeEl = document.getElementById('image-filesize');
const splitBtn = document.getElementById('split-btn');
const resultArea = document.getElementById('result-area');
const downloadBtn = document.getElementById('download-btn');

// モード設定パネル
const settingsPanels = {
    grid: document.getElementById('grid-settings'),
    splitline: document.getElementById('splitline-settings'),
    crop: document.getElementById('crop-settings'),
    fixedsize: document.getElementById('fixedsize-settings'),
    horizontal4: document.getElementById('horizontal4-settings'),
};

// ===== マネージャー初期化 =====
const canvasManager = new CanvasManager();
const gridMode = new GridMode(canvasManager);
const splitlineMode = new SplitlineMode(canvasManager);
const cropMode = new CropMode(canvasManager);
const fixedSizeMode = new FixedSizeMode(canvasManager);
const horizontal4Mode = new Horizontal4Mode(canvasManager);
const exporter = new Exporter();

const modes = {
    grid: gridMode,
    splitline: splitlineMode,
    crop: cropMode,
    fixedsize: fixedSizeMode,
    horizontal4: horizontal4Mode,
};

// ===== 画像アップロード =====
const uploader = new ImageUploader((img, info) => {
    // 画像情報表示
    imageNameEl.textContent = info.name;
    imageSizeEl.textContent = `${info.width} × ${info.height} px`;
    imageFilesizeEl.textContent = formatFileSize(info.size);

    // UIの切替
    uploadArea.classList.add('hidden');
    editorArea.classList.remove('hidden');

    // リセット
    resultArea.classList.add('hidden');
    downloadBtn.classList.add('hidden');

    // Canvas に画像を設定
    canvasManager.setImage(img);
    exporter.setImage(img, info.name);

    imageLoaded = true;

    // 現在のモードをアクティベート
    switchMode(currentMode);
});

// ===== モード切替 =====
function switchMode(mode) {
    // 前のモードを非アクティブに
    if (modes[currentMode]) {
        modes[currentMode].deactivate();
    }

    currentMode = mode;

    // タブの切替
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    // 設定パネルの切替
    Object.entries(settingsPanels).forEach(([key, panel]) => {
        panel.classList.toggle('hidden', key !== mode);
    });

    // 新しいモードをアクティベート
    if (modes[mode] && imageLoaded) {
        modes[mode].activate();
    }

    // Exporter のリージョンゲッターを更新
    exporter.setRegionsGetter(() => {
        return modes[currentMode].getRegions();
    });
}

// タブクリックイベント
document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        switchMode(tab.dataset.mode);
    });
});

// ===== 分割実行 =====
splitBtn.addEventListener('click', async () => {
    if (!imageLoaded) return;
    splitBtn.disabled = true;
    try {
        await exporter.split();
    } catch (err) {
        console.error('分割エラー:', err);
        alert('分割処理中にエラーが発生しました。');
    }
    splitBtn.disabled = false;
});

// ===== ユーティリティ =====
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ===== ウィンドウリサイズ対応 =====
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (imageLoaded) {
            canvasManager._fitToContainer();
            canvasManager.draw();
            // crop モードの場合はオーバーレイも再同期
            if (currentMode === 'crop') {
                cropMode._syncOverlaySize();
                cropMode._renderCropBoxes();
            }
        }
    }, 100);
});

// ===== 初期モード =====
// デフォルトはグリッドモード（DOMの初期状態と一致）
