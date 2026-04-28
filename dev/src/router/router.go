package router

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/gpwork4u/aibo/handler"
	"github.com/gpwork4u/aibo/middleware"
	"github.com/gpwork4u/aibo/service"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Setup 設定路由
func Setup(pool *pgxpool.Pool, apiKeySvc *service.ApiKeyService, apiKeyHandler *handler.ApiKeyHandler, categoryHandler *handler.CategoryHandler, llmProviderHandler *handler.LlmProviderHandler, entryHandler *handler.EntryHandler, classifyHandler *handler.ClassifyHandler, searchHandler *handler.SearchHandler, gitImportHandler *handler.GitImportHandler, gcalHandler *handler.GcalHandler, confidenceHandler *handler.ConfidenceHandler, statsHandler *handler.StatsHandler, systemHandler *handler.SystemHandler, lifecycleHandler *handler.LifecycleHandler, calendarConvertHandler *handler.CalendarConvertHandler, calendarHandler *handler.CalendarHandler, journalHandler *handler.JournalHandler, journalDraftHandler *handler.JournalDraftHandler, journalAutoHandler *handler.JournalAutoHandler, projectHandler *handler.ProjectHandler, taskHandler *handler.TaskHandler, githubIntegrationHandler *handler.GitHubIntegrationHandler, githubCommitsHandler *handler.GitHubCommitsHandler, viewHandler *handler.ViewHandler, entryLinksHandler *handler.EntryLinksHandler) *gin.Engine {
	r := gin.Default()

	// CORS middleware — 允許跨網域（前端 localhost:3000 呼叫 API localhost:8080）
	r.Use(middleware.CORSMiddleware())

	// 健康檢查（不需認證）
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// 測試用 DB reset（只在 AIBO_TEST_MODE=1 時啟用，不需認證）
	if os.Getenv("AIBO_TEST_MODE") == "1" {
		testResetHandler := handler.NewTestResetHandler(pool)
		r.POST("/api/v1/__test/reset", testResetHandler.Reset)
	}

	// API v1 路由群組（需要認證）
	v1 := r.Group("/api/v1")
	v1.Use(middleware.AuthMiddleware(apiKeySvc))
	{
		// API Key 管理
		auth := v1.Group("/auth")
		{
			auth.POST("/api-keys", apiKeyHandler.Create)
			auth.GET("/api-keys", apiKeyHandler.List)
			auth.DELETE("/api-keys/:id", apiKeyHandler.Delete)
		}

		// 分類管理
		categories := v1.Group("/categories")
		{
			categories.POST("", categoryHandler.Create)
			categories.GET("", categoryHandler.List)
			categories.GET("/:id", categoryHandler.GetByID)
			categories.PUT("/:id", categoryHandler.Update)
			categories.DELETE("/:id", categoryHandler.Delete)
		}

		// LLM Provider 管理
		llmProviders := v1.Group("/llm-providers")
		{
			llmProviders.POST("", llmProviderHandler.Create)
			llmProviders.GET("", llmProviderHandler.List)
			llmProviders.GET("/:id", llmProviderHandler.Get)
			llmProviders.PUT("/:id", llmProviderHandler.Update)
			llmProviders.DELETE("/:id", llmProviderHandler.Delete)
			llmProviders.POST("/:id/health", llmProviderHandler.HealthCheck)
		}

		// 知識條目管理
		entries := v1.Group("/entries")
		{
			entries.POST("", entryHandler.Create)
			entries.GET("", entryHandler.List)
			entries.GET("/:id", entryHandler.GetByID)
			entries.PATCH("/:id", entryHandler.Update)
			entries.DELETE("/:id", entryHandler.Delete)

			// 信心度操作
			entries.POST("/:id/confirm", confidenceHandler.Confirm)
			entries.POST("/:id/flag", confidenceHandler.Flag)
			entries.GET("/:id/flags", confidenceHandler.ListFlags)

			// 知識生命週期
			entries.POST("/:id/supersede", lifecycleHandler.Supersede)
			entries.DELETE("/:id/supersede", lifecycleHandler.ClearSupersede)
			entries.GET("/:id/history", lifecycleHandler.GetHistory)

			// LLM 自動分類
			entries.POST("/:id/classify", classifyHandler.Classify)
			entries.POST("/classify-all", classifyHandler.ClassifyAll)
		}

		// 行事曆（F-026c：gcal event → entry 轉換）
		//
		// 此 group 目前只掛 to-entry；F-026b 的 List/GetDay 由另一支 handler 於其 PR 追加。
		calendar := v1.Group("/calendar")
		{
			calendar.POST("/events/:gcal_id/to-entry", calendarConvertHandler.ConvertToEntry)
		}

		// Google Calendar 整合
		integrations := v1.Group("/integrations")
		{
			integrations.POST("/gcal/auth", gcalHandler.StartAuth)
			integrations.GET("/gcal/callback", gcalHandler.Callback)
			// F-030c：read-through events + reauth detection
			integrations.GET("/gcal/events", gcalHandler.ListEventsExternal)
			// F-030b：連線狀態 / 可選日曆 / 設定 / 中斷連線
			integrations.GET("/gcal/status", gcalHandler.GetStatus)
			integrations.GET("/gcal/calendars", gcalHandler.ListCalendars)
			integrations.PUT("/gcal/settings", gcalHandler.UpdateSettings)
			integrations.DELETE("/gcal", gcalHandler.Disconnect)

			// F-034a：GitHub PAT 整合（connect / status / disconnect）
			integrations.POST("/github/connect", githubIntegrationHandler.Connect)
			integrations.GET("/github/status", githubIntegrationHandler.GetStatus)
			integrations.DELETE("/github", githubIntegrationHandler.Disconnect)

			// F-034b：取得指定日期區間的 GitHub commits（給 journal draft + 行事曆用）
			integrations.GET("/github/commits", githubCommitsHandler.ListCommits)
		}

		// 匯入
		importGroup := v1.Group("/import")
		{
			importGroup.POST("/git", gitImportHandler.Import)
			importGroup.POST("/gcal", gcalHandler.Import)
		}

		// 搜尋
		search := v1.Group("/search")
		{
			search.POST("", searchHandler.SmartSearch)
			search.GET("/simple", searchHandler.SimpleSearch)
		}

		// 統計
		v1.GET("/stats", statsHandler.GetStats)

		// 系統資訊
		system := v1.Group("/system")
		{
			system.GET("/search-config", systemHandler.GetSearchConfig)
		}

		// 行事曆彙整（F-026b）
		calendarGroup := v1.Group("/calendar")
		{
			calendarGroup.GET("", calendarHandler.Aggregate)
			calendarGroup.GET("/days/:date", calendarHandler.GetDay)
		}

		// 每日日記（F-028b：CRUD；F-028c：LLM draft；F-028d：自動生成）
		journal := v1.Group("/journal")
		{
			journal.GET("", journalHandler.List)
			journal.POST("", journalHandler.Create)
			journal.GET("/:date", journalHandler.GetByDate)
			journal.PATCH("/:date", journalHandler.Update)
			journal.DELETE("/:date", journalHandler.Delete)
			// F-028c：LLM 草稿（不直接寫入 DB；前端拿 draft 編輯後再 PATCH）
			journal.POST("/:date/draft", journalDraftHandler.Draft)
			// F-028d：idempotent get-or-create（自動生成並落地 DB）
			journal.POST("/:date/auto", journalAutoHandler.AutoGenerate)
		}

		// 專案（F-031b：CRUD + archive + force delete）
		projects := v1.Group("/projects")
		{
			projects.POST("", projectHandler.Create)
			projects.GET("", projectHandler.List)
			projects.GET("/:id", projectHandler.GetByID)
			projects.PATCH("/:id", projectHandler.Update)
			projects.DELETE("/:id", projectHandler.Delete)
			projects.POST("/:id/archive", projectHandler.Archive)

			// 巢狀 task：建立 / 列表（F-031c）
			projects.POST("/:id/tasks", taskHandler.CreateInProject)
			projects.GET("/:id/tasks", taskHandler.ListByProject)
		}

		// 任務（F-031c：詳情 / 更新 / 完成 / 刪除 / upcoming / overdue）
		// 注意：/upcoming /overdue 必須在 /:id 之前以避免誤匹配
		tasks := v1.Group("/tasks")
		{
			tasks.GET("/upcoming", taskHandler.Upcoming)
			tasks.GET("/overdue", taskHandler.Overdue)
			tasks.GET("/:id", taskHandler.GetByID)
			tasks.PATCH("/:id", taskHandler.Update)
			tasks.POST("/:id/complete", taskHandler.Complete)
			tasks.DELETE("/:id", taskHandler.Delete)
		}

		// Saved Views（F-043）
		// 注意：/reorder 必須在 /:id 之前以避免誤匹配
		views := v1.Group("/views")
		{
			views.GET("", viewHandler.List)
			views.POST("", viewHandler.Create)
			views.PATCH("/reorder", viewHandler.Reorder)
			views.PATCH("/:id", viewHandler.Update)
			views.DELETE("/:id", viewHandler.Delete)
		}

		// Entry Links（F-044）—— 語意關聯
		// 注意：/links/:link_id 必須在 /:id/links 之前定義以避免 Gin 路由衝突
		entries.GET("/:id/links", entryLinksHandler.ListLinks)
		entries.POST("/:id/links", entryLinksHandler.CreateLink)
		entries.PATCH("/links/:link_id", entryLinksHandler.UpdateLink)
		entries.DELETE("/links/:link_id", entryLinksHandler.DeleteLink)

		// Knowledge Graph（F-044）
		v1.GET("/graph", entryLinksHandler.GetGraph)
	}

	return r
}
