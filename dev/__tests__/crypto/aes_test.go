package crypto_test

import (
	"testing"

	"github.com/gpwork4u/aibo/crypto"
)

// 測試用 32-byte key
var testKey = []byte("01234567890123456789012345678901")

func TestNewAESCryptoWithKey_ValidKey(t *testing.T) {
	c, err := crypto.NewAESCryptoWithKey(testKey)
	if err != nil {
		t.Fatalf("NewAESCryptoWithKey() error = %v", err)
	}
	if c == nil {
		t.Fatal("NewAESCryptoWithKey() returned nil")
	}
}

func TestNewAESCryptoWithKey_InvalidKeyLength(t *testing.T) {
	tests := []struct {
		name string
		key  []byte
	}{
		{"too short", []byte("short")},
		{"too long", []byte("01234567890123456789012345678901234")},
		{"16 bytes", []byte("0123456789012345")},
		{"empty", []byte{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := crypto.NewAESCryptoWithKey(tt.key)
			if err == nil {
				t.Error("expected error for invalid key length")
			}
		})
	}
}

func TestEncryptDecrypt_Roundtrip(t *testing.T) {
	c, err := crypto.NewAESCryptoWithKey(testKey)
	if err != nil {
		t.Fatalf("NewAESCryptoWithKey() error = %v", err)
	}

	tests := []struct {
		name      string
		plaintext string
	}{
		{"simple text", "hello world"},
		{"api key", "sk-1234567890abcdefghijklmnopqrstuvwxyz"},
		{"empty string", ""},
		{"unicode text", "你好世界"},
		{"special chars", "!@#$%^&*()_+-={}[]|\\:\";<>?,./~`"},
		{"long text", "a very long api key that might be used with some providers and contains lots of characters to test boundary conditions"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			encrypted, err := c.Encrypt(tt.plaintext)
			if err != nil {
				t.Fatalf("Encrypt() error = %v", err)
			}

			if encrypted == tt.plaintext {
				t.Error("encrypted text should not equal plaintext")
			}

			decrypted, err := c.Decrypt(encrypted)
			if err != nil {
				t.Fatalf("Decrypt() error = %v", err)
			}

			if decrypted != tt.plaintext {
				t.Errorf("Decrypt() = %q, want %q", decrypted, tt.plaintext)
			}
		})
	}
}

func TestEncrypt_ProducesDifferentCiphertext(t *testing.T) {
	c, err := crypto.NewAESCryptoWithKey(testKey)
	if err != nil {
		t.Fatalf("NewAESCryptoWithKey() error = %v", err)
	}

	plaintext := "sk-test-key-12345"
	encrypted1, err := c.Encrypt(plaintext)
	if err != nil {
		t.Fatalf("first Encrypt() error = %v", err)
	}

	encrypted2, err := c.Encrypt(plaintext)
	if err != nil {
		t.Fatalf("second Encrypt() error = %v", err)
	}

	// 由於每次使用隨機 nonce，相同明文應產生不同密文
	if encrypted1 == encrypted2 {
		t.Error("same plaintext should produce different ciphertext due to random nonce")
	}

	// 但兩者都應能正確解密
	decrypted1, _ := c.Decrypt(encrypted1)
	decrypted2, _ := c.Decrypt(encrypted2)
	if decrypted1 != plaintext || decrypted2 != plaintext {
		t.Error("both ciphertexts should decrypt to the same plaintext")
	}
}

func TestDecrypt_InvalidInput(t *testing.T) {
	c, err := crypto.NewAESCryptoWithKey(testKey)
	if err != nil {
		t.Fatalf("NewAESCryptoWithKey() error = %v", err)
	}

	tests := []struct {
		name  string
		input string
	}{
		{"invalid base64", "not-valid-base64!!!"},
		{"too short", "AAAA"},
		{"empty", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := c.Decrypt(tt.input)
			if err == nil {
				t.Error("expected error for invalid input")
			}
		})
	}
}

func TestDecrypt_WrongKey(t *testing.T) {
	c1, _ := crypto.NewAESCryptoWithKey(testKey)
	c2, _ := crypto.NewAESCryptoWithKey([]byte("99999999999999999999999999999999"))

	encrypted, err := c1.Encrypt("secret data")
	if err != nil {
		t.Fatalf("Encrypt() error = %v", err)
	}

	_, err = c2.Decrypt(encrypted)
	if err == nil {
		t.Error("expected error when decrypting with wrong key")
	}
}
