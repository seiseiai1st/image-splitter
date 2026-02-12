/**
 * uploader.js - 画像アップロード（ドラッグ&ドロップ + ファイル選択）
 */

export class ImageUploader {
    constructor(onImageLoaded) {
        this.onImageLoaded = onImageLoaded;
        this.uploadArea = document.getElementById('upload-area');
        this.uploadBtn = document.getElementById('upload-btn');
        this.fileInput = document.getElementById('file-input');
        this.changeImageBtn = document.getElementById('change-image-btn');

        this._bindEvents();
    }

    _bindEvents() {
        // ファイル選択ボタン
        this.uploadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.fileInput.click();
        });

        // ファイル入力変更
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this._loadFile(e.target.files[0]);
            }
        });

        // ドラッグ&ドロップ
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('drag-over');
        });

        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('drag-over');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                this._loadFile(e.dataTransfer.files[0]);
            }
        });

        // アップロードエリア全体をクリック
        this.uploadArea.addEventListener('click', () => {
            this.fileInput.click();
        });

        // 画像変更ボタン
        this.changeImageBtn.addEventListener('click', () => {
            this.fileInput.click();
        });
    }

    _loadFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('画像ファイルを選択してください。');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.onImageLoaded(img, {
                    name: file.name,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    size: file.size,
                    type: file.type
                });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}
