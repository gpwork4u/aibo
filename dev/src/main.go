package main

import (
	"context"
	"embed"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/gpwork4u/aibo/config"
	"github.com/gpwork4u/aibo/crypto"
	"github.com/gpwork4u/aibo/handler"
	"github.com/gpwork4u/aibo/repository"
	"github.com/gpwork4u/aibo/router"
	"github.com/gpwork4u/aibo/service"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migration/*.sql
var migrationFS embed.FS

func main() {
	// 載入設定
	cfg, err := config.Load()
	if err != nil {
		slog.Error("載入設定失敗", "error", err)
		os.Exit(1)
	}

	// 執行 DB migration
	if err := runMigrations(cfg.DatabaseURL); err != nil {
		slog.Error("執行 migration 失敗", "error", err)
		os.Exit(1)
	}
	slog.Info("DB migration 完成")

	// 建立 DB 連線池
	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		slog.Error("建立資料庫連線池失敗", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// 驗證連線
	if err := pool.Ping(context.Background()); err != nil {
		slog.Error("資料庫連線失敗", "error", err)
		os.Exit(1)
	}
	slog.Info("資料庫連線成功")

	// 初始化 AES 加密模組
	aesCrypto, err := crypto.NewAESCrypto()
	if err != nil {
		slog.Error("初始化加密模組失敗", "error", err)
		os.Exit(1)
	}
	slog.Info("AES-256-GCM 加密模組初始化完成")

	// 初始化各層
	apiKeyRepo := repository.NewApiKeyRepository(pool)
	apiKeySvc := service.NewApiKeyService(apiKeyRepo)
	apiKeyHandler := handler.NewApiKeyHandler(apiKeySvc)

	categoryRepo := repository.NewCategoryRepository(pool)
	categorySvc := service.NewCategoryService(categoryRepo)
	categoryHandler := handler.NewCategoryHandler(categorySvc)

	llmProviderRepo := repository.NewLlmProviderRepository(pool)
	llmProviderSvc := service.NewLlmProviderService(llmProviderRepo, aesCrypto)
	llmProviderHandler := handler.NewLlmProviderHandler(llmProviderSvc)

	entryRepo := repository.NewEntryRepository(pool)
	entrySvc := service.NewEntryService(entryRepo)

	// 初始化 LLM 分類服務（含 client 連線池）
	llmSvc := service.NewLlmService(llmProviderSvc, aesCrypto)
	llmProviderSvc.SetLlmService(llmSvc) // 反向參考：provider 更新/刪除時清除 client 快取
	classifierSvc := service.NewClassifierService(llmSvc, entryRepo, categoryRepo)
	classifierWorker := service.NewClassifierWorker(classifierSvc)
	classifierWorker.Start()

	entryHandler := handler.NewEntryHandler(entrySvc, classifierWorker)
	confidenceHandler := handler.NewConfidenceHandler(entrySvc)
	classifyHandler := handler.NewClassifyHandler(classifierSvc, classifierWorker, entryRepo)

	// 初始化 Git 匯入服務
	gitImportSvc := service.NewGitImportService(entryRepo)
	gitImportSvc.SetAllowedRepoPaths(cfg.AllowedRepoPaths)
	gitImportHandler := handler.NewGitImportHandler(gitImportSvc)

	// 初始化 Google Calendar 整合服務
	gcalRepo := repository.NewGcalIntegrationRepository(pool)
	gcalConfig := &service.GcalConfig{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURL,
	}
	gcalSvc := service.NewGcalService(gcalRepo, entryRepo, aesCrypto, gcalConfig)
	gcalHandler := handler.NewGcalHandler(gcalSvc)

	// 行事曆轉換（F-026c）
	calendarConvertSvc := service.NewCalendarConvertService(gcalSvc, entryRepo)
	calendarConvertHandler := handler.NewCalendarConvertHandler(calendarConvertSvc)

	// 初始化搜尋服務
	searchRepo := repository.NewSearchRepository(pool)
	searchSvc := service.NewSearchService(llmSvc, searchRepo)
	searchHandler := handler.NewSearchHandler(searchSvc)

	// 初始化統計服務
	statsRepo := repository.NewStatsRepository(pool)
	statsSvc := service.NewStatsService(statsRepo)
	statsHandler := handler.NewStatsHandler(statsSvc)

	// 初始化系統資訊服務
	systemRepo := repository.NewSystemRepository(pool)
	systemSvc := service.NewSystemService(systemRepo)
	systemHandler := handler.NewSystemHandler(systemSvc)

	// 初始化知識生命週期服務
	lifecycleSvc := service.NewLifecycleService(entryRepo)
	lifecycleHandler := handler.NewLifecycleHandler(lifecycleSvc)

	// 設定路由
	r := router.Setup(apiKeySvc, apiKeyHandler, categoryHandler, llmProviderHandler, entryHandler, classifyHandler, searchHandler, gitImportHandler, gcalHandler, confidenceHandler, statsHandler, systemHandler, lifecycleHandler, calendarConvertHandler)

	// 啟動 HTTP server（graceful shutdown）
	srv := &http.Server{
		Addr:    ":" + cfg.ServerPort,
		Handler: r,
	}

	go func() {
		slog.Info("啟動 API 伺服器", "port", cfg.ServerPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("伺服器啟動失敗", "error", err)
			os.Exit(1)
		}
	}()

	// 等待中斷信號
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("收到關閉信號，正在優雅關閉伺服器...")

	// 先關閉分類 worker（等待進行中的任務完成）
	classifierWorker.Shutdown()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("伺服器關閉失敗", "error", err)
	}
	slog.Info("伺服器已關閉")
}

func runMigrations(databaseURL string) error {
	d, err := iofs.New(migrationFS, "migration")
	if err != nil {
		return fmt.Errorf("建立 migration source 失敗: %w", err)
	}

	m, err := migrate.NewWithSourceInstance("iofs", d, databaseURL)
	if err != nil {
		return fmt.Errorf("建立 migrate instance 失敗: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("執行 migration 失敗: %w", err)
	}

	return nil
}
