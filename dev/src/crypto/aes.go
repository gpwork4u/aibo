package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"os"
)

const (
	nonceSize = 12 // AES-GCM 標準 nonce 長度
	keyEnvVar = "AIBO_ENCRYPTION_KEY"
)

// AESCrypto AES-256-GCM 加解密
type AESCrypto struct {
	key []byte
}

// NewAESCrypto 從環境變數載入加密金鑰，建立 AESCrypto
func NewAESCrypto() (*AESCrypto, error) {
	keyStr := os.Getenv(keyEnvVar)
	if keyStr == "" {
		return nil, fmt.Errorf("%s 環境變數未設定", keyEnvVar)
	}

	key, err := parseKey(keyStr)
	if err != nil {
		return nil, fmt.Errorf("解析加密金鑰失敗: %w", err)
	}

	if len(key) != 32 {
		return nil, fmt.Errorf("加密金鑰長度必須為 32 bytes，目前為 %d bytes", len(key))
	}

	return &AESCrypto{key: key}, nil
}

// NewAESCryptoWithKey 使用指定的 key 建立 AESCrypto（用於測試）
func NewAESCryptoWithKey(key []byte) (*AESCrypto, error) {
	if len(key) != 32 {
		return nil, fmt.Errorf("加密金鑰長度必須為 32 bytes，目前為 %d bytes", len(key))
	}
	return &AESCrypto{key: key}, nil
}

// Encrypt 加密明文，回傳 base64(nonce + ciphertext + tag)
func (a *AESCrypto) Encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(a.key)
	if err != nil {
		return "", fmt.Errorf("建立 cipher 失敗: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("建立 GCM 失敗: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("產生 nonce 失敗: %w", err)
	}

	// Seal appends ciphertext+tag to nonce
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)

	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt 解密 base64(nonce + ciphertext + tag)，回傳明文
func (a *AESCrypto) Decrypt(encoded string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("base64 解碼失敗: %w", err)
	}

	block, err := aes.NewCipher(a.key)
	if err != nil {
		return "", fmt.Errorf("建立 cipher 失敗: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("建立 GCM 失敗: %w", err)
	}

	if len(data) < gcm.NonceSize() {
		return "", fmt.Errorf("密文資料太短")
	}

	nonce := data[:gcm.NonceSize()]
	ciphertext := data[gcm.NonceSize():]

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("解密失敗: %w", err)
	}

	return string(plaintext), nil
}

// parseKey 嘗試以 hex 或 base64 解析金鑰
func parseKey(keyStr string) ([]byte, error) {
	// 嘗試 hex 解碼（64 hex chars = 32 bytes）
	if len(keyStr) == 64 {
		key, err := hex.DecodeString(keyStr)
		if err == nil {
			return key, nil
		}
	}

	// 嘗試 base64 解碼
	key, err := base64.StdEncoding.DecodeString(keyStr)
	if err == nil && len(key) == 32 {
		return key, nil
	}

	// 直接當 raw bytes 使用
	if len(keyStr) == 32 {
		return []byte(keyStr), nil
	}

	return nil, fmt.Errorf("無法解析金鑰，支援 hex（64 字元）、base64 或 raw（32 bytes）格式")
}
